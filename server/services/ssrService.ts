import express from 'express';
import { db, isTestProduct } from '../db.ts';
import { nativePool } from '../mysqlPool.ts';
import { mapSqlRowToProduct } from '../routes/products.ts';
import { Product, StoreSettings } from '../../src/types/index.ts';
import { DEFAULT_CATEGORIES } from '../../src/data/categories.ts';

// Chat web de WAI (agente de IA). Se inyecta en las páginas SSR (catálogo y producto).
const WAI_CHAT_SCRIPT = `<script src="https://api.artechclick.com/api/v1/chatweb/widget.js" data-wai="cw_pub_1sp5ttzhz0h6c1tuv3em" async></script>`;


// Helper to sanitize strings for HTML insertion
function escapeHtml(str: string = ''): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Clean string for meta descriptions (strip HTML tags, newlines, extra spaces)
function cleanMetaText(str: string = '', maxLen: number = 160): string {
  const plain = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length <= maxLen) return plain;
  return plain.slice(0, maxLen - 3).trim() + '...';
}

// Format COP currency
function formatCOP(amount: number): string {
  return `$${Math.round(amount || 0).toLocaleString('es-CO')} COP`;
}

// Format phone number to clean WhatsApp international standard (e.g. 573008784427)
function formatWhatsAppNumber(phone?: string): string {
  if (!phone) return '573008784427';
  let clean = phone.replace(/[^\d]/g, '');
  if (!clean) return '573008784427';
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = `57${clean}`;
  }
  return clean;
}

// Get absolute base URL from request
function getBaseUrl(req: express.Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'zavelastore.com.co';
  return `${forwardedProto}://${host}`;
}

export class SsrService {
  /**
   * Extrae todos los productos activos directamente desde MySQL en cPanel,
   * con sincronización y fallback seguro a la base de datos local.
   */
  public async getActiveProductsFromDb(): Promise<Product[]> {
    if (nativePool) {
      try {
        const [rows]: any = await nativePool.query(
          'SELECT * FROM productos WHERE active = 1 ORDER BY created_at DESC'
        );
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map(mapSqlRowToProduct).filter((p: any) => !isTestProduct(p));
        }
      } catch (err: any) {
        console.warn('[SSR MySQL Products Query Warning]:', err?.message);
      }
    }
    return db.getProducts({ onlyActive: true }).filter(p => !isTestProduct(p));
  }

  /**
   * Extrae un producto específico por slug o ID directamente desde MySQL en cPanel.
   */
  public async getProductByIdentifierFromDb(identifier: string): Promise<Product | null> {
    const cleanId = decodeURIComponent(identifier).trim();
    if (nativePool) {
      try {
        // 1. Consulta SQL limpia y directa por ID primario
        const [rowsById]: any = await nativePool.query(
          'SELECT * FROM productos WHERE id = ? LIMIT 1',
          [cleanId]
        );
        if (Array.isArray(rowsById) && rowsById.length > 0) {
          const product = mapSqlRowToProduct(rowsById[0]);
          if (!isTestProduct(product)) return product;
        }

        // 2. Fallbacks opcionales por dropi_product_id o slug
        try {
          const [rowsFallback]: any = await nativePool.query(
            'SELECT * FROM productos WHERE (dropi_product_id = ? OR slug = ?) LIMIT 1',
            [cleanId, cleanId]
          );
          if (Array.isArray(rowsFallback) && rowsFallback.length > 0) {
            const product = mapSqlRowToProduct(rowsFallback[0]);
            if (!isTestProduct(product)) return product;
          }
        } catch (eFallback: any) {}
      } catch (err: any) {
        console.warn('[SSR MySQL Single Product Lookup Warning]:', err?.message);
      }
    }
    const local = db.getProductById(cleanId);
    if (local && !isTestProduct(local)) return local;
    return null;
  }

  /**
   * Extrae las categorías activas directamente desde MySQL en cPanel con fallback local.
   */
  public async getActiveCategoriesFromDb(): Promise<{ id: string; name: string; slug: string; productCount?: number }[]> {
    const products = await this.getActiveProductsFromDb();
    let categories: any[] = [];

    if (nativePool) {
      try {
        const [rows]: any = await nativePool.query(
          'SELECT id, name, slug, active FROM categorias WHERE active = 1 ORDER BY name ASC'
        );
        if (Array.isArray(rows) && rows.length > 0) {
          categories = rows;
        }
      } catch (err: any) {
        console.warn('[SSR MySQL Categories Query Warning]:', err?.message);
      }
    }

    if (!categories || categories.length === 0) {
      categories = db.getCategories();
    }

    if (!categories || categories.length === 0) {
      categories = DEFAULT_CATEGORIES.filter(c => c.active !== false);
    }

    // Filtro de aislamiento de datos: nunca incluir asesores, administradores, sexshop ni zonas restringidas en el catálogo oficial
    const filtered = categories.filter(c => {
      const n = (c.name || '').toLowerCase();
      const s = (c.slug || '').toLowerCase();
      return !n.includes('sexshop') && !n.includes('adult') && !s.includes('sex') && !n.includes('asesor') && !n.includes('admin');
    });

    return filtered.map(cat => {
      const cleanId = String(cat.id || '');
      const cleanSlug = String(cat.slug || cat.id || '').toLowerCase();
      const cleanName = String(cat.name || '').toLowerCase();
      const count = products.filter(p => {
        const pCatId = String(p.categoryId || '').toLowerCase();
        const pCatName = String(p.categoryName || '').toLowerCase();
        return pCatId === cleanId.toLowerCase() || pCatName === cleanName || pCatName.includes(cleanSlug);
      }).length;

      return {
        id: cat.id,
        name: cat.name,
        slug: cat.slug || cat.id,
        productCount: count
      };
    });
  }

  /**
   * Renderiza el encabezado HTML y el menú desplegable de Catálogo activado mediante CSS puro.
   */
  public renderHeaderHtml(navCategories: { id: string; name: string; slug: string; productCount?: number }[], currentPath: string = '/catalogo'): string {
    const isCatalogActive = currentPath.startsWith('/catalogo');
    const isProductActive = currentPath.startsWith('/producto');

    return `
  <div class="trust-bar">
    <span class="trust-item">🇨🇴 Envíos a toda Colombia</span>
    <span class="trust-item">💵 Pago Contra Entrega en Efectivo</span>
    <span class="trust-item">🛡️ Garantía Directa</span>
  </div>

  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="brand" aria-label="Zavela Store Colombia">
        <span class="brand-badge">ZAVELA</span>
        <span>Store Colombia</span>
      </a>

      <nav class="nav-links">
        <a href="/" class="nav-link ${currentPath === '/' ? 'active' : ''}">Inicio</a>

        <!-- Dropdown de Catálogo mediante CSS puro (SEO & Sin JavaScript) -->
        <div class="nav-dropdown-wrapper">
          <a href="/catalogo" class="nav-link nav-link-dropdown ${isCatalogActive || isProductActive ? 'active' : ''}" aria-haspopup="true">
            <span>Catálogo</span>
            <svg class="dropdown-chevron" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </a>

          <div class="pure-css-dropdown" role="menu">
            <div class="dropdown-mega-layout">
              <div class="dropdown-categories-col">
                <div class="dropdown-heading">
                  <span class="dropdown-icon">📦</span>
                  <span class="dropdown-heading-text">Nuestras Categorías</span>
                </div>
                <div class="dropdown-grid">
                  ${navCategories.map(c => `
                    <a href="/catalogo?categoria=${encodeURIComponent(c.slug || c.name)}" class="dropdown-cat-card" role="menuitem">
                      <span class="cat-card-icon">🛍️</span>
                      <div class="cat-card-info">
                        <span class="cat-card-title">${escapeHtml(c.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim())}</span>
                        <span class="cat-card-count">${c.productCount ? `${c.productCount} productos` : 'Ver catálogo'}</span>
                      </div>
                    </a>
                  `).join('')}
                </div>
              </div>

              <div class="dropdown-promo-col">
                <div>
                  <div class="promo-badge">🛡️ PAGO CONTRA ENTREGA</div>
                  <h3 class="promo-title">Compra segura a nivel nacional</h3>
                  <p class="promo-desc">Revisa tus productos en casa antes de pagar en efectivo al domiciliario.</p>
                </div>
                <a href="/catalogo" class="promo-btn">Ver Todo el Catálogo →</a>
              </div>
            </div>
          </div>
        </div>

        <a href="/catalogo?ofertas=1" class="nav-link nav-link-hot">🔥 Ofertas <span class="hot-badge">HOT</span></a>
        <a href="/rastreo" class="nav-link">Rastreo</a>
        <a href="/quienes-somos" class="nav-link">Quiénes Somos</a>
      </nav>
    </div>
  </header>
    `;
  }

  /**
   * Genera el sitemap.xml dinámico con todas las URLs de productos y páginas clave desde MySQL.
   */
  public async generateSitemapXml(baseUrl: string): Promise<string> {
    const products = await this.getActiveProductsFromDb();
    const nowIso = new Date().toISOString();

    const staticPages = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/catalogo`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/rastreo`, priority: '0.6', changefreq: 'weekly' },
      { loc: `${baseUrl}/quienes-somos`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${baseUrl}/zavelastoresex`, priority: '0.7', changefreq: 'weekly' }
    ];

    const productPages = products.map(p => {
      const slug = p.slug || p.id;
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString() : nowIso;
      return `  <url>
    <loc>${baseUrl}/producto/${escapeHtml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    const staticXml = staticPages.map(page => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${productPages.join('\n')}
</urlset>`;
  }

  /**
   * Genera el robots.txt permitiendo el rastreo del catálogo y productos.
   */
  public generateRobotsTxt(baseUrl: string): string {
    return `User-agent: *
Allow: /
Allow: /catalogo
Allow: /producto/
Disallow: /admin
Disallow: /admin/
Disallow: /api/
Disallow: /asesor
Disallow: /advisor

Sitemap: ${baseUrl}/sitemap.xml
`;
  }

  /**
   * Renderiza la página /catalogo en HTML puro (sin requerir JavaScript) extrayendo los datos de MySQL.
   */
  public async renderCatalogPage(req: express.Request): Promise<string> {
    const baseUrl = getBaseUrl(req);
    const settings: StoreSettings = db.getSettings();
    const rawPhone = settings.whatsappSettings?.phoneNumber || settings.whatsappNumber || '573008784427';
    const whatsappNum = formatWhatsAppNumber(rawPhone);

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.max(1, Math.min(48, parseInt(String(req.query.limit || '12'), 10) || 12));
    const searchQuery = String(req.query.q || '').trim().toLowerCase();
    const categoryFilter = String(req.query.categoria || '').trim().toLowerCase();

    let allProducts = await this.getActiveProductsFromDb();

    if (searchQuery) {
      allProducts = allProducts.filter(p => 
        (p.title || '').toLowerCase().includes(searchQuery) ||
        (p.description || '').toLowerCase().includes(searchQuery) ||
        (p.categoryName || '').toLowerCase().includes(searchQuery)
      );
    }

    if (categoryFilter && categoryFilter !== 'todos') {
      allProducts = allProducts.filter(p => 
        (p.categoryName || '').toLowerCase().includes(categoryFilter) ||
        (p.categoryId || '').toLowerCase().includes(categoryFilter)
      );
    }

    const totalProducts = allProducts.length;
    const totalPages = Math.ceil(totalProducts / limit) || 1;
    const startIndex = (page - 1) * limit;
    const pageProducts = allProducts.slice(startIndex, startIndex + limit);

    const categories = Array.from(new Set(allProducts.map(p => p.categoryName || 'General'))).filter(Boolean);
    const navCategories = await this.getActiveCategoriesFromDb();

    // JSON-LD ItemList
    const jsonLdItemList = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Catálogo Oficial de Zavela Store Colombia',
      'description': 'Catálogo completo de productos con despacho nacional y Pago Contra Entrega en Colombia.',
      'numberOfItems': pageProducts.length,
      'itemListElement': pageProducts.map((p, index) => ({
        '@type': 'ListItem',
        'position': startIndex + index + 1,
        'item': {
          '@type': 'Product',
          'name': p.title,
          'image': p.image || `${baseUrl}/images/logo-zavela.jpg`,
          'description': cleanMetaText(p.shortDescription || p.description, 150),
          'url': `${baseUrl}/producto/${p.slug || p.id}`,
          'offers': {
            '@type': 'Offer',
            'priceCurrency': 'COP',
            'price': p.price,
            'availability': 'https://schema.org/InStock'
          }
        }
      }))
    };

    const titleText = `Catálogo de Productos (Pág. ${page}) | Zavela Store Colombia - Pago Contra Entrega`;
    const descText = `Explora el catálogo oficial de Zavela Store en Colombia. Perfumería, hogar, tecnología y herramientas con precios en COP y Pago Contra Entrega en efectivo al recibir en casa.`;

    const productCardsHtml = pageProducts.map(p => {
      const productUrl = `/producto/${encodeURIComponent(p.slug || p.id)}`;
      const hasDiscount = p.compareAtPrice && p.compareAtPrice > p.price;
      const discountPercentage = hasDiscount 
        ? Math.round(((p.compareAtPrice! - p.price) / p.compareAtPrice!) * 100) 
        : 0;

      const waText = encodeURIComponent(`¡Hola Zavela Store! Me interesa el producto "${p.title}" ($${p.price.toLocaleString('es-CO')} COP) del catálogo con Pago Contra Entrega.`);
      const waUrl = `https://wa.me/${whatsappNum}?text=${waText}`;

      return `
        <article class="product-card" id="prod-${escapeHtml(p.id)}">
          <div class="product-image-container">
            <a href="${productUrl}">
              <img 
                src="${escapeHtml(p.image || '/images/logo-zavela.jpg')}" 
                alt="${escapeHtml(p.title)}" 
                loading="lazy" 
                class="product-image"
              />
            </a>
            ${discountPercentage > 0 ? `<span class="badge discount-badge">-${discountPercentage}% OFF</span>` : ''}
            <span class="badge cod-badge">Pago Contra Entrega</span>
          </div>
          <div class="product-info">
            <span class="product-category">${escapeHtml(p.categoryName || 'General')}</span>
            <h2 class="product-title">
              <a href="${productUrl}">${escapeHtml(p.title)}</a>
            </h2>
            <p class="product-description">${escapeHtml(cleanMetaText(p.shortDescription || p.description, 110))}</p>
            <div class="price-container">
              <span class="current-price">${formatCOP(p.price)}</span>
              ${hasDiscount ? `<del class="compare-price">${formatCOP(p.compareAtPrice!)}</del>` : ''}
            </div>
            <div class="actions-container">
              <a href="${productUrl}" class="btn btn-secondary">Ver Producto</a>
              <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-primary">Pedir por WhatsApp</a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Pagination HTML
    const prevPageUrl = page > 1 ? `/catalogo?page=${page - 1}&limit=${limit}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${categoryFilter ? `&categoria=${encodeURIComponent(categoryFilter)}` : ''}` : null;
    const nextPageUrl = page < totalPages ? `/catalogo?page=${page + 1}&limit=${limit}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}${categoryFilter ? `&categoria=${encodeURIComponent(categoryFilter)}` : ''}` : null;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titleText)}</title>
  <meta name="description" content="${escapeHtml(descText)}">
  <link rel="canonical" href="${baseUrl}/catalogo?page=${page}">
  
  <!-- OpenGraph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(titleText)}">
  <meta property="og:description" content="${escapeHtml(descText)}">
  <meta property="og:url" content="${baseUrl}/catalogo">
  <meta property="og:image" content="${baseUrl}/images/logo-zavela.jpg">
  <meta property="og:site_name" content="Zavela Store Colombia">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(titleText)}">
  <meta name="twitter:description" content="${escapeHtml(descText)}">
  <meta name="twitter:image" content="${baseUrl}/images/logo-zavela.jpg">

  <!-- Schema.org Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(jsonLdItemList)}
  </script>

  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --secondary: #0ea5e9;
      --whatsapp: #16a34a;
      --whatsapp-hover: #15803d;
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --radius: 14px;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    a { color: inherit; text-decoration: none; }
    
    /* Header & Pure CSS Dropdown Styles */
    .site-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      position: relative;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 800;
      font-size: 1.25rem;
      color: var(--text);
      text-decoration: none;
    }
    .brand-badge {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: white;
      padding: 0.25rem 0.6rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-link {
      color: #334155;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem 0;
      transition: color 0.15s ease;
    }
    .nav-link:hover, .nav-link.active {
      color: #0284c7;
    }
    .nav-link-hot {
      color: #ff5a36;
      font-weight: 800;
    }
    .nav-link-hot:hover {
      color: #e02656;
    }
    .hot-badge {
      background: linear-gradient(to right, #ef4444, #e11d48);
      color: white;
      font-size: 0.6rem;
      padding: 0.1rem 0.35rem;
      border-radius: 9999px;
      font-weight: 900;
    }
    .dropdown-chevron {
      width: 0.85rem;
      height: 0.85rem;
      transition: transform 0.2s ease;
    }

    /* PURE CSS DROPDOWN ACTIVATION */
    .nav-dropdown-wrapper {
      position: relative;
      display: inline-block;
      padding: 0.25rem 0;
    }
    .pure-css-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      left: -120px;
      width: 780px;
      max-width: 90vw;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      padding: 1.5rem;
      z-index: 100;
      text-transform: none;
      letter-spacing: normal;
    }
    /* Pure CSS :hover and :focus-within triggers */
    .nav-dropdown-wrapper:hover .pure-css-dropdown,
    .nav-dropdown-wrapper:focus-within .pure-css-dropdown,
    .pure-css-dropdown:hover {
      display: block;
    }
    .nav-dropdown-wrapper:hover .dropdown-chevron,
    .nav-dropdown-wrapper:focus-within .dropdown-chevron {
      transform: rotate(180deg);
      color: #0284c7;
    }
    .dropdown-mega-layout {
      display: flex;
      gap: 1.5rem;
    }
    .dropdown-categories-col {
      flex: 1;
    }
    .dropdown-heading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.75rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .dropdown-heading-text {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
    }
    .dropdown-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .dropdown-cat-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.85rem;
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.15s ease;
      background: #ffffff;
      min-height: 52px;
    }
    .dropdown-cat-card:hover {
      border-color: #bae6fd;
      background: #f0f9ff;
      transform: translateY(-1px);
    }
    .cat-card-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cat-card-info {
      flex: 1;
      min-width: 0;
      overflow: visible;
    }
    .cat-card-title {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e293b;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: normal;
      text-overflow: clip;
      overflow: visible;
      line-height: 1.25;
    }
    .dropdown-cat-card:hover .cat-card-title {
      color: #0369a1;
    }
    .cat-card-count {
      display: block;
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 0.15rem;
    }
    .dropdown-promo-col {
      width: 250px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%);
      color: white;
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .promo-badge {
      color: #34d399;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .promo-title {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0.4rem 0;
      line-height: 1.25;
    }
    .promo-desc {
      font-size: 0.75rem;
      color: #cbd5e1;
      line-height: 1.4;
      margin-bottom: 1rem;
    }
    .promo-btn {
      display: block;
      text-align: center;
      background: linear-gradient(to right, #10b981, #0d9488);
      color: white;
      padding: 0.55rem 0.85rem;
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 800;
      text-decoration: none;
    }
    .promo-btn:hover {
      filter: brightness(1.1);
    }
    @media (max-width: 860px) {
      .pure-css-dropdown {
        width: 320px;
        left: -40px;
      }
      .dropdown-mega-layout {
        flex-direction: column;
      }
      .dropdown-promo-col {
        width: 100%;
      }
      .dropdown-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Trust banner */
    .trust-bar {
      background: #0f172a;
      color: #e2e8f0;
      padding: 0.55rem 1rem;
      font-size: 0.82rem;
      text-align: center;
      font-weight: 600;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .trust-item { display: inline-flex; align-items: center; gap: 0.35rem; }

    /* Main Container */
    .container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1.25rem;
    }
    .page-header {
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.4rem;
    }
    .page-subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    /* Search & Filter Bar */
    .filter-bar {
      background: var(--surface);
      padding: 1rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      margin-bottom: 2rem;
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-bar input, .filter-bar select {
      padding: 0.65rem 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.9rem;
      background: white;
      color: var(--text);
    }
    .filter-bar input { flex: 1; min-width: 220px; }
    .filter-bar button {
      padding: 0.65rem 1.25rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Product Grid */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    .product-card {
      background: var(--surface);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .product-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    }
    .product-image-container {
      position: relative;
      background: #f1f5f9;
      aspect-ratio: 1;
      overflow: hidden;
    }
    .product-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .badge {
      position: absolute;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .discount-badge {
      top: 0.75rem;
      left: 0.75rem;
      background: #dc2626;
      color: white;
    }
    .cod-badge {
      bottom: 0.75rem;
      left: 0.75rem;
      background: #065f46;
      color: #ecfdf5;
      font-size: 0.68rem;
    }
    .product-info {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .product-category {
      font-size: 0.75rem;
      color: var(--secondary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.35rem;
    }
    .product-title {
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.35;
      margin-bottom: 0.5rem;
      color: #0f172a;
    }
    .product-title a:hover { color: var(--primary); }
    .product-description {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
      flex: 1;
    }
    .price-container {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
      margin-bottom: 1rem;
    }
    .current-price {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
    }
    .compare-price {
      font-size: 0.88rem;
      color: #94a3b8;
    }
    .actions-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .btn {
      display: block;
      text-align: center;
      padding: 0.65rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.88rem;
      transition: background 0.15s ease;
    }
    .btn-primary {
      background: var(--whatsapp);
      color: white;
    }
    .btn-primary:hover { background: var(--whatsapp-hover); }
    .btn-secondary {
      background: #e0e7ff;
      color: var(--primary);
    }
    .btn-secondary:hover { background: #c7d2fe; }

    /* Pagination */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin: 2.5rem 0;
    }
    .page-btn {
      padding: 0.65rem 1.25rem;
      border: 1px solid var(--border);
      background: white;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .page-btn:hover:not(.disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }
    .page-btn.disabled {
      opacity: 0.45;
      pointer-events: none;
      cursor: not-allowed;
    }
    .page-indicator {
      font-size: 0.9rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Footer */
    .site-footer {
      background: #0f172a;
      color: #94a3b8;
      padding: 3rem 1.25rem 2rem;
      border-top: 1px solid #1e293b;
      margin-top: 4rem;
      font-size: 0.9rem;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }
    .footer-col h3 {
      color: white;
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }
    .footer-col p { line-height: 1.6; }
    .footer-bottom {
      max-width: 1200px;
      margin: 0 auto;
      padding-top: 2rem;
      border-top: 1px solid #1e293b;
      text-align: center;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  ${this.renderHeaderHtml(navCategories, req.path)}

  <main class="container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Catálogo Oficial de Productos</h1>
        <p class="page-subtitle">Disponibles con despacho prioritario y Pago Contra Entrega en toda Colombia (${totalProducts} artículos)</p>
      </div>
      <div>
        <a href="/" class="btn btn-secondary">⚡ Ir a la Tienda Interactiva</a>
      </div>
    </div>

    <!-- Buscador y filtro estático -->
    <form method="GET" action="/catalogo" class="filter-bar">
      <input 
        type="search" 
        name="q" 
        placeholder="Buscar por nombre, perfume, tecnología, hogar..." 
        value="${escapeHtml(searchQuery)}"
      />
      <select name="categoria">
        <option value="">Todas las Categorías</option>
        ${categories.map(cat => `<option value="${escapeHtml(cat)}" ${categoryFilter === cat.toLowerCase() ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
      </select>
      <button type="submit">Filtrar</button>
      ${searchQuery || categoryFilter ? `<a href="/catalogo" class="btn btn-secondary" style="padding: 0.65rem 1rem;">Limpiar</a>` : ''}
    </form>

    <!-- Grid de productos -->
    <div class="product-grid">
      ${productCardsHtml || '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: 12px;"><p style="font-size: 1.1rem; color: #64748b;">No se encontraron productos con el filtro especificado.</p><a href="/catalogo" class="btn btn-primary" style="display: inline-block; margin-top: 1rem;">Ver Todo el Catálogo</a></div>'}
    </div>

    <!-- Paginación estática -->
    ${totalPages > 1 ? `
    <nav class="pagination" aria-label="Paginación del catálogo">
      <a href="${prevPageUrl || '#'}" class="page-btn ${!prevPageUrl ? 'disabled' : ''}">← Anterior</a>
      <span class="page-indicator">Página <strong>${page}</strong> de <strong>${totalPages}</strong></span>
      <a href="${nextPageUrl || '#'}" class="page-btn ${!nextPageUrl ? 'disabled' : ''}">Siguiente →</a>
    </nav>
    ` : ''}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col">
        <h3>Zavela Store Colombia</h3>
        <p>Tu tienda de confianza en Colombia. Especialistas en perfumería fina, tecnología de vanguardia, hogar y artículos de tendencia.</p>
      </div>
      <div class="footer-col">
        <h3>Modalidad de Compra</h3>
        <p><strong>Pago Contra Entrega:</strong> Pide por la web o WhatsApp y pagas en efectivo únicamente cuando la transportadora entrega en la puerta de tu casa.</p>
      </div>
      <div class="footer-col">
        <h3>Atención Oficial</h3>
        <p>Línea WhatsApp: +${whatsappNum}<br>Horario: Lunes a Sábado 8:00 AM - 7:00 PM</p>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${new Date().getFullYear()} Zavela Store Colombia. Todos los derechos reservados.</p>
    </div>
  </footer>

  <!-- Script de interfaz cargado de forma asíncrona (defer) sin bloquear ni eliminar el HTML del servidor -->
  <script defer>
    document.addEventListener('DOMContentLoaded', function() {
      var dropdown = document.querySelector('.nav-dropdown-wrapper');
      if (dropdown) {
        dropdown.addEventListener('click', function(e) {
          if (window.innerWidth < 860) {
            var menu = this.querySelector('.pure-css-dropdown');
            if (menu && (e.target.closest('.nav-link-dropdown') || e.target.classList.contains('nav-link-dropdown'))) {
              e.preventDefault();
              menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
            }
          }
        });
      }
    });
  </script>
  ${WAI_CHAT_SCRIPT}
</body>
</html>`;
  }

  /**
   * Renderiza una página individual por producto en HTML puro con metadatos y Schema.org.
   */
  /**
   * Renderiza una página individual por producto en HTML puro con metadatos y Schema.org extrayendo los datos de MySQL.
   */
  public async renderProductPage(req: express.Request, identifier: string): Promise<string> {
    const baseUrl = getBaseUrl(req);
    const settings: StoreSettings = db.getSettings();
    const rawPhone = settings.whatsappSettings?.phoneNumber || settings.whatsappNumber || '573008784427';
    const whatsappNum = formatWhatsAppNumber(rawPhone);

    const cleanId = decodeURIComponent(identifier).trim();
    const product = await this.getProductByIdentifierFromDb(cleanId);

    if (!product || isTestProduct(product)) {
      return this.renderProductNotFoundPage(cleanId, baseUrl);
    }

    const titleText = `${product.title} | Zavela Store Colombia - Pago Contra Entrega`;
    const cleanDesc = cleanMetaText(product.description || product.shortDescription || `${product.title} con despacho a toda Colombia y Pago Contra Entrega en efectivo al recibir en casa.`);
    const canonicalUrl = `${baseUrl}/producto/${encodeURIComponent(product.slug || product.id)}`;
    const imageUrl = product.image ? (product.image.startsWith('http') ? product.image : `${baseUrl}${product.image}`) : `${baseUrl}/images/logo-zavela.jpg`;

    const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
    const discountPercentage = hasDiscount 
      ? Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100) 
      : 0;

    const waOrderText = encodeURIComponent(`¡Hola Zavela Store! Quiero ordenar con Pago Contra Entrega el producto:\n\n• *${product.title}*\n• *Precio:* ${formatCOP(product.price)}\n\nPor favor indícame los datos para formalizar mi despacho.`);
    const waOrderUrl = `https://wa.me/${whatsappNum}?text=${waOrderText}`;

    // Schema.org Product JSON-LD
    const productImages = Array.isArray(product.images) && product.images.length > 0 
      ? product.images.map(img => img.startsWith('http') ? img : `${baseUrl}${img}`)
      : [imageUrl];

    const jsonLdProduct = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      'name': product.title,
      'image': productImages,
      'description': cleanDesc,
      'sku': product.id,
      'brand': {
        '@type': 'Brand',
        'name': product.brand || 'Zavela Store'
      },
      'category': product.categoryName || 'General',
      'offers': {
        '@type': 'Offer',
        'url': canonicalUrl,
        'priceCurrency': 'COP',
        'price': product.price,
        'priceValidUntil': '2027-12-31',
        'itemCondition': 'https://schema.org/NewCondition',
        'availability': (product.stock ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/InStock',
        'seller': {
          '@type': 'Organization',
          'name': 'Zavela Store Colombia'
        }
      }
    };

    // Related products
    const allActive = await this.getActiveProductsFromDb();
    const navCategories = await this.getActiveCategoriesFromDb();
    const related = allActive
      .filter(p => p.id !== product.id && !isTestProduct(p) && (p.categoryName === product.categoryName || p.featured))
      .slice(0, 4);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(titleText)}</title>
  <meta name="description" content="${escapeHtml(cleanDesc)}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- OpenGraph / Facebook / WhatsApp -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtml(titleText)}">
  <meta property="og:description" content="${escapeHtml(cleanDesc)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:site_name" content="Zavela Store Colombia">
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="COP">
  
  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(titleText)}">
  <meta name="twitter:description" content="${escapeHtml(cleanDesc)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

  <!-- Schema.org Product Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(jsonLdProduct)}
  </script>

  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --secondary: #0ea5e9;
      --whatsapp: #16a34a;
      --whatsapp-hover: #15803d;
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --radius: 14px;
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }
    a { color: inherit; text-decoration: none; }
    
    /* Header & Pure CSS Dropdown Styles */
    .site-header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      position: relative;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 800;
      font-size: 1.25rem;
      color: var(--text);
      text-decoration: none;
    }
    .brand-badge {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: white;
      padding: 0.25rem 0.6rem;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .nav-link {
      color: #334155;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem 0;
      transition: color 0.15s ease;
    }
    .nav-link:hover, .nav-link.active {
      color: #0284c7;
    }
    .nav-link-hot {
      color: #ff5a36;
      font-weight: 800;
    }
    .nav-link-hot:hover {
      color: #e02656;
    }
    .hot-badge {
      background: linear-gradient(to right, #ef4444, #e11d48);
      color: white;
      font-size: 0.6rem;
      padding: 0.1rem 0.35rem;
      border-radius: 9999px;
      font-weight: 900;
    }
    .dropdown-chevron {
      width: 0.85rem;
      height: 0.85rem;
      transition: transform 0.2s ease;
    }

    /* PURE CSS DROPDOWN ACTIVATION */
    .nav-dropdown-wrapper {
      position: relative;
      display: inline-block;
      padding: 0.25rem 0;
    }
    .pure-css-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      left: -120px;
      width: 780px;
      max-width: 90vw;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
      padding: 1.5rem;
      z-index: 100;
      text-transform: none;
      letter-spacing: normal;
    }
    .nav-dropdown-wrapper:hover .pure-css-dropdown,
    .nav-dropdown-wrapper:focus-within .pure-css-dropdown,
    .pure-css-dropdown:hover {
      display: block;
    }
    .nav-dropdown-wrapper:hover .dropdown-chevron,
    .nav-dropdown-wrapper:focus-within .dropdown-chevron {
      transform: rotate(180deg);
      color: #0284c7;
    }
    .dropdown-mega-layout {
      display: flex;
      gap: 1.5rem;
    }
    .dropdown-categories-col {
      flex: 1;
    }
    .dropdown-heading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.75rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .dropdown-heading-text {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
    }
    .dropdown-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }
    .dropdown-cat-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.85rem;
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.15s ease;
      background: #ffffff;
      min-height: 52px;
    }
    .dropdown-cat-card:hover {
      border-color: #bae6fd;
      background: #f0f9ff;
      transform: translateY(-1px);
    }
    .cat-card-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cat-card-info {
      flex: 1;
      min-width: 0;
      overflow: visible;
    }
    .cat-card-title {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e293b;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
      word-break: normal;
      text-overflow: clip;
      overflow: visible;
      line-height: 1.25;
    }
    .dropdown-cat-card:hover .cat-card-title {
      color: #0369a1;
    }
    .cat-card-count {
      display: block;
      font-size: 0.7rem;
      color: #64748b;
      margin-top: 0.15rem;
    }
    .dropdown-promo-col {
      width: 250px;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%);
      color: white;
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .promo-badge {
      color: #34d399;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .promo-title {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0.4rem 0;
      line-height: 1.25;
    }
    .promo-desc {
      font-size: 0.75rem;
      color: #cbd5e1;
      line-height: 1.4;
      margin-bottom: 1rem;
    }
    .promo-btn {
      display: block;
      text-align: center;
      background: linear-gradient(to right, #10b981, #0d9488);
      color: white;
      padding: 0.55rem 0.85rem;
      border-radius: 10px;
      font-size: 0.78rem;
      font-weight: 800;
      text-decoration: none;
    }
    .promo-btn:hover {
      filter: brightness(1.1);
    }
    @media (max-width: 860px) {
      .pure-css-dropdown {
        width: 320px;
        left: -40px;
      }
      .dropdown-mega-layout {
        flex-direction: column;
      }
      .dropdown-promo-col {
        width: 100%;
      }
      .dropdown-grid {
        grid-template-columns: 1fr;
      }
    }

    .trust-bar {
      background: #0f172a;
      color: #e2e8f0;
      padding: 0.55rem 1rem;
      font-size: 0.82rem;
      text-align: center;
      font-weight: 600;
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    /* Breadcrumbs */
    .breadcrumbs {
      max-width: 1200px;
      margin: 1.25rem auto 0;
      padding: 0 1.25rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .breadcrumbs a:hover { color: var(--primary); }

    /* Product Layout */
    .product-container {
      max-width: 1200px;
      margin: 1.5rem auto 3rem;
      padding: 0 1.25rem;
      display: grid;
      grid-template-columns: 1fr;
      gap: 2.5rem;
    }
    @media (min-width: 768px) {
      .product-container {
        grid-template-columns: 1fr 1.15fr;
      }
    }

    /* Gallery */
    .gallery-container {
      background: var(--surface);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      padding: 1rem;
      position: relative;
    }
    .main-image {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 10px;
      background: #f1f5f9;
      display: block;
    }
    .badge-discount {
      position: absolute;
      top: 1.5rem;
      left: 1.5rem;
      background: #dc2626;
      color: white;
      font-weight: 800;
      font-size: 0.85rem;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
    }

    /* Product Details */
    .details-card {
      background: var(--surface);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      padding: 2rem;
      box-shadow: var(--shadow);
    }
    .category-tag {
      color: var(--secondary);
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      display: inline-block;
    }
    .product-heading {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
      margin-bottom: 1rem;
    }
    .price-box {
      background: #f8fafc;
      border: 1px solid var(--border);
      padding: 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: baseline;
      gap: 0.85rem;
      flex-wrap: wrap;
    }
    .price-main {
      font-size: 2rem;
      font-weight: 900;
      color: #0f172a;
    }
    .price-old {
      font-size: 1.1rem;
      color: #94a3b8;
    }
    .guarantee-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 1rem;
      border-radius: 10px;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .guarantee-box strong { display: block; font-size: 0.95rem; margin-bottom: 0.2rem; }

    .cta-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .btn-big {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      font-size: 1.05rem;
      font-weight: 700;
      text-align: center;
      transition: all 0.15s ease;
    }
    .btn-wa {
      background: var(--whatsapp);
      color: white;
    }
    .btn-wa:hover { background: var(--whatsapp-hover); }
    .btn-interactive {
      background: #e0e7ff;
      color: var(--primary);
    }
    .btn-interactive:hover { background: #c7d2fe; }

    .description-section {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }
    .description-section h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      color: #0f172a;
    }
    .description-body {
      color: #334155;
      font-size: 0.95rem;
      white-space: pre-line;
      line-height: 1.7;
    }

    /* Related Products */
    .related-section {
      max-width: 1200px;
      margin: 3rem auto;
      padding: 0 1.25rem;
    }
    .related-title {
      font-size: 1.4rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
    }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.25rem;
    }

    /* Footer */
    .site-footer {
      background: #0f172a;
      color: #94a3b8;
      padding: 3rem 1.25rem 2rem;
      margin-top: 4rem;
      font-size: 0.9rem;
    }
    .footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 2rem;
    }
  </style>
</head>
<body>
  ${this.renderHeaderHtml(navCategories, req.path)}

  <div class="breadcrumbs">
    <a href="/">Inicio</a> &gt; 
    <a href="/catalogo">Catálogo</a> &gt; 
    <span>${escapeHtml(product.title)}</span>
  </div>

  <main class="product-container">
    <div class="gallery-container">
      <img 
        src="${escapeHtml(imageUrl)}" 
        alt="${escapeHtml(product.title)}" 
        class="main-image"
      />
      ${discountPercentage > 0 ? `<div class="badge-discount">-${discountPercentage}% OFF</div>` : ''}
    </div>

    <div class="details-card">
      <span class="category-tag">${escapeHtml(product.categoryName || 'General')}</span>
      <h1 class="product-heading">${escapeHtml(product.title)}</h1>

      <div class="price-box">
        <span class="price-main">${formatCOP(product.price)}</span>
        ${hasDiscount ? `<del class="price-old">${formatCOP(product.compareAtPrice!)}</del>` : ''}
      </div>

      <div class="guarantee-box">
        <strong>🚚 Pago Contra Entrega en Colombia</strong>
        Pagas en efectivo directamente al transportador cuando el paquete llegue a tu puerta. Tiempos de entrega estimados: 2 a 5 días hábiles.
      </div>

      <div class="cta-stack">
        <a href="${waOrderUrl}" target="_blank" rel="noopener" class="btn-big btn-wa">
          <span>💬 Pedir por WhatsApp (Contra Entrega)</span>
        </a>
        <a href="/?producto=${encodeURIComponent(product.slug || product.id)}" class="btn-big btn-interactive">
          <span>🛍️ Comprar en Tienda Interactiva</span>
        </a>
      </div>

      <div class="description-section">
        <h2>Descripción del Producto</h2>
        <div class="description-body">${escapeHtml(product.description || product.shortDescription || 'Producto oficial disponible en Zavela Store Colombia con garantía de satisfacción.')}</div>
      </div>
    </div>
  </main>

  ${related.length > 0 ? `
  <section class="related-section">
    <h2 class="related-title">También te puede interesar</h2>
    <div class="related-grid">
      ${related.map(r => `
        <article style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem;">
          <a href="/producto/${encodeURIComponent(r.slug || r.id)}">
            <img src="${escapeHtml(r.image || '/images/logo-zavela.jpg')}" alt="${escapeHtml(r.title)}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;" />
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-bottom: 0.4rem;">${escapeHtml(r.title)}</h3>
            <p style="font-weight: 800; color: #4f46e5;">${formatCOP(r.price)}</p>
          </a>
        </article>
      `).join('')}
    </div>
  </section>
  ` : ''}

  <footer class="site-footer">
    <div class="footer-inner">
      <div>
        <h3 style="color: white; margin-bottom: 0.5rem;">Zavela Store Colombia</h3>
        <p>Tu tienda de confianza en Colombia. Especialistas en perfumería fina, tecnología de vanguardia y productos del hogar.</p>
      </div>
      <div>
        <h3 style="color: white; margin-bottom: 0.5rem;">Envíos y Pagos</h3>
        <p>Despachos a nivel nacional con transportadoras aliadas y Pago Contra Entrega en efectivo al recibir.</p>
      </div>
    </div>
  </footer>

  <!-- Script de interfaz cargado de forma asíncrona (defer) sin bloquear ni eliminar el HTML del servidor -->
  <script defer>
    document.addEventListener('DOMContentLoaded', function() {
      var dropdown = document.querySelector('.nav-dropdown-wrapper');
      if (dropdown) {
        dropdown.addEventListener('click', function(e) {
          if (window.innerWidth < 860) {
            var menu = this.querySelector('.pure-css-dropdown');
            if (menu && (e.target.closest('.nav-link-dropdown') || e.target.classList.contains('nav-link-dropdown'))) {
              e.preventDefault();
              menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
            }
          }
        });
      }
    });
  </script>
  ${WAI_CHAT_SCRIPT}
</body>
</html>`;
  }

  /**
   * Renderiza una página 404 para productos no encontrados con sugerencias.
   */
  public renderProductNotFoundPage(identifier: string, baseUrl: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Producto no encontrado | Zavela Store Colombia</title>
  <meta name="robots" content="noindex, follow">
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; text-align: center; padding: 4rem 1rem; }
    .card { max-width: 500px; margin: 0 auto; background: white; padding: 2.5rem; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { font-size: 1.75rem; margin-bottom: 0.75rem; color: #0f172a; }
    p { color: #64748b; margin-bottom: 1.5rem; font-size: 0.95rem; }
    .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #4f46e5; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Producto no encontrado</h1>
    <p>Lo sentimos, el producto "${escapeHtml(identifier)}" no se encuentra disponible actualmente en nuestro catálogo oficial o ha sido actualizado.</p>
    <a href="/catalogo" class="btn">Explorar Catálogo de Productos</a>
  </div>
</body>
</html>`;
  }
}

export const ssrService = new SsrService();
