<?php
/**
 * ==============================================================================
 * Zavela Store Colombia - Catálogo SSR en PHP (HTML Puro para Buscadores)
 * Archivo: catalogo.php
 * Ubicación: /public_html/catalogo.php
 * ==============================================================================
 */

header('Content-Type: text/html; charset=utf-8');

// Configuración de base de datos MySQL cPanel
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'zavela_store';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

$products = [];
$totalProducts = 0;

try {
    $pdo = new PDO(
        "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(48, (int)$_GET['limit'])) : 12;
    $offset = ($page - 1) * $limit;
    $search = isset($_GET['q']) ? trim($_GET['q']) : '';
    $category = isset($_GET['categoria']) ? trim($_GET['categoria']) : '';

    $where = ["active = 1"];
    $params = [];

    // Bloqueo estricto de pruebas y asesores
    $where[] = "LOWER(nombre) NOT LIKE '%prueba%' AND LOWER(nombre) NOT LIKE '%dummy%' AND LOWER(nombre) NOT LIKE '%asesor%' AND LOWER(nombre) NOT LIKE '%admin%'";

    if ($search !== '') {
        $where[] = "(nombre LIKE ? OR descripcion LIKE ? OR categoria LIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }

    if ($category !== '' && $category !== 'todos') {
        $where[] = "categoria = ?";
        $params[] = $category;
    }

    $whereSql = implode(' AND ', $where);

    // Conteo total
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM productos WHERE {$whereSql}");
    $countStmt->execute($params);
    $totalProducts = (int)$countStmt->fetchColumn();

    // Consulta de productos paginados
    $stmt = $pdo->prepare("SELECT * FROM productos WHERE {$whereSql} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}");
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    // Consulta de categorías activas para el Header Dropdown
    $navCategories = [];
    try {
        $catStmt = $pdo->query("SELECT id, name, slug FROM categorias WHERE active = 1 AND LOWER(name) NOT LIKE '%asesor%' AND LOWER(name) NOT LIKE '%admin%' AND LOWER(name) NOT LIKE '%sexshop%' ORDER BY name ASC");
        $navCategories = $catStmt->fetchAll();
    } catch (Exception $eCat) {
        $navCategories = [];
    }

    if (empty($navCategories)) {
        try {
            $catStmt = $pdo->query("SELECT DISTINCT categoria as name, LOWER(categoria) as slug FROM productos WHERE active = 1 AND categoria IS NOT NULL AND categoria != '' AND LOWER(categoria) NOT LIKE '%asesor%' AND LOWER(categoria) NOT LIKE '%admin%'");
            $navCategories = $catStmt->fetchAll();
        } catch (Exception $eCat2) {
            $navCategories = [
                ['name' => 'Perfumería & Fragancias', 'slug' => 'perfumeria-fragancias'],
                ['name' => 'Hogar y Cocina', 'slug' => 'hogar-cocina'],
                ['name' => 'Tecnología y Gadgets', 'slug' => 'tecnologia'],
                ['name' => 'Belleza y Cuidado Personal', 'slug' => 'belleza-cuidado'],
                ['name' => 'Artículos Navideños', 'slug' => 'navidad-diciembre']
            ];
        }
    }

} catch (Exception $e) {
    // Si la conexión falla en pruebas locales, fallback a datos predeterminados
    $products = [];
    $navCategories = [
        ['name' => 'Perfumería & Fragancias', 'slug' => 'perfumeria-fragancias'],
        ['name' => 'Hogar y Cocina', 'slug' => 'hogar-cocina'],
        ['name' => 'Tecnología y Gadgets', 'slug' => 'tecnologia'],
        ['name' => 'Belleza y Cuidado Personal', 'slug' => 'belleza-cuidado'],
        ['name' => 'Artículos Navideños', 'slug' => 'navidad-diciembre']
    ];
}

$totalPages = max(1, ceil($totalProducts / (isset($limit) ? $limit : 12)));
$whatsappNum = '573008784427';
$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";

function formatCOP($val) {
    return '$' . number_format((float)$val, 0, ',', '.') . ' COP';
}

function cleanMeta($str, $max = 150) {
    $clean = strip_tags($str);
    $clean = preg_replace('/\s+/', ' ', trim($clean));
    if (mb_strlen($clean) <= $max) return $clean;
    return mb_substr($clean, 0, $max - 3) . '...';
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Catálogo Oficial de Productos (Pág. <?= $page ?>) | Zavela Store Colombia - Pago Contra Entrega</title>
  <meta name="description" content="Explora el catálogo oficial de Zavela Store Colombia con precios en COP y Pago Contra Entrega en efectivo al recibir en casa.">
  <link rel="canonical" href="<?= $baseUrl ?>/catalogo?page=<?= $page ?>">

  <!-- OpenGraph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="Catálogo Oficial de Productos | Zavela Store Colombia">
  <meta property="og:description" content="Catálogo completo con precios en pesos colombianos y despacho con Pago Contra Entrega a toda Colombia.">
  <meta property="og:url" content="<?= $baseUrl ?>/catalogo">
  <meta property="og:image" content="<?= $baseUrl ?>/images/logo-zavela.jpg">
  <meta property="og:site_name" content="Zavela Store Colombia">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Catálogo Oficial Zavela Store Colombia",
    "numberOfItems": <?= count($products) ?>,
    "itemListElement": [
      <?php foreach ($products as $idx => $p): 
        $pSlug = !empty($p['slug']) ? $p['slug'] : $p['id'];
        $pPrice = (float)($p['precio'] ?? $p['price'] ?? 0);
        $pImg = !empty($p['imagen']) ? $p['imagen'] : (!empty($p['image']) ? $p['image'] : "$baseUrl/images/logo-zavela.jpg");
      ?>
      {
        "@type": "ListItem",
        "position": <?= $offset + $idx + 1 ?>,
        "item": {
          "@type": "Product",
          "name": <?= json_encode($p['nombre'] ?? $p['title']) ?>,
          "image": <?= json_encode($pImg) ?>,
          "url": <?= json_encode("$baseUrl/producto/$pSlug") ?>,
          "offers": {
            "@type": "Offer",
            "priceCurrency": "COP",
            "price": <?= $pPrice ?>,
            "availability": "https://schema.org/InStock"
          }
        }
      }<?= $idx < count($products) - 1 ? ',' : '' ?>
      <?php endforeach; ?>
    ]
  }
  </script>

  <style>
    :root {
      --primary: #4f46e5;
      --whatsapp: #16a34a;
      --bg: #f8fafc;
      --surface: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.5; }
    a { color: inherit; text-decoration: none; }
    .trust-bar { background: #0f172a; color: #e2e8f0; padding: 0.5rem 1rem; font-size: 0.8rem; text-align: center; font-weight: 600; display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
    .site-header { background: white; border-bottom: 1px solid var(--border); padding: 0.85rem 1.25rem; position: sticky; top: 0; z-index: 50; }
    .header-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; position: relative; }
    .brand { font-weight: 800; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: #0f172a; }
    .badge-brand { background: linear-gradient(135deg, #0284c7, #0369a1); color: white; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 800; }
    
    /* Navigation & Pure CSS Dropdown */
    .nav-links { display: flex; align-items: center; gap: 1.5rem; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .nav-link { color: #334155; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0; }
    .nav-link:hover, .nav-link.active { color: #0284c7; }
    .nav-link-hot { color: #ff5a36; }
    .nav-link-hot:hover { color: #e02656; }
    .hot-badge { background: #ef4444; color: white; font-size: 0.6rem; padding: 0.1rem 0.35rem; border-radius: 9999px; }
    .nav-dropdown-wrapper { position: relative; display: inline-block; padding: 0.25rem 0; }
    .pure-css-dropdown { display: none; position: absolute; top: 100%; left: -100px; width: 750px; max-width: 90vw; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); padding: 1.5rem; z-index: 100; text-transform: none; letter-spacing: normal; }
    .nav-dropdown-wrapper:hover .pure-css-dropdown, .nav-dropdown-wrapper:focus-within .pure-css-dropdown, .pure-css-dropdown:hover { display: block; }
    .dropdown-mega-layout { display: flex; gap: 1.5rem; }
    .dropdown-categories-col { flex: 1; }
    .dropdown-heading { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #0f172a; padding-bottom: 0.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.4rem; }
    .dropdown-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.65rem; }
    .dropdown-cat-card { display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.8rem; border: 1px solid #f1f5f9; border-radius: 10px; text-decoration: none; background: white; min-height: 52px; }
    .dropdown-cat-card:hover { border-color: #bae6fd; background: #f0f9ff; }
    .cat-card-info { flex: 1; min-width: 0; overflow: visible; }
    .cat-card-title { font-size: 0.82rem; font-weight: 700; color: #1e293b; display: block; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: normal; text-overflow: clip; overflow: visible; line-height: 1.25; }
    .cat-card-count { font-size: 0.7rem; color: #64748b; display: block; margin-top: 0.15rem; }
    .dropdown-promo-col { width: 240px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%); color: white; border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; }
    .promo-badge { color: #34d399; font-size: 0.65rem; font-weight: 800; }
    .promo-title { font-size: 0.95rem; font-weight: 800; margin: 0.4rem 0; line-height: 1.25; }
    .promo-desc { font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 1rem; }
    .promo-btn { display: block; text-align: center; background: #10b981; color: white; padding: 0.55rem 0.85rem; border-radius: 8px; font-size: 0.78rem; font-weight: 800; text-decoration: none; }
    @media (max-width: 860px) { .pure-css-dropdown { width: 300px; left: -30px; } .dropdown-mega-layout { flex-direction: column; } .dropdown-promo-col { width: 100%; } .dropdown-grid { grid-template-columns: 1fr; } }

    .container { max-width: 1200px; margin: 2rem auto; padding: 0 1.25rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
    .card { background: white; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column; }
    .card-img { width: 100%; aspect-ratio: 1; object-fit: cover; background: #f1f5f9; }
    .card-body { padding: 1.2rem; display: flex; flex-direction: column; flex: 1; }
    .cat { font-size: 0.75rem; color: #0ea5e9; font-weight: 700; text-transform: uppercase; margin-bottom: 0.25rem; }
    .title { font-size: 1.05rem; font-weight: 700; margin-bottom: 0.5rem; line-height: 1.35; }
    .title a:hover { color: var(--primary); }
    .desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; flex: 1; }
    .price { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem; }
    .btn { display: block; text-align: center; padding: 0.65rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.88rem; margin-top: 0.35rem; }
    .btn-wa { background: var(--whatsapp); color: white; }
    .btn-view { background: #e0e7ff; color: var(--primary); }
    .pagination { display: flex; justify-content: center; gap: 1rem; margin: 2.5rem 0; align-items: center; }
    .page-btn { padding: 0.6rem 1.2rem; background: white; border: 1px solid var(--border); border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="trust-bar">
    <span>🇨🇴 Envíos a toda Colombia</span>
    <span>💵 Pago Contra Entrega en Efectivo</span>
    <span>🛡️ Garantía Directa</span>
  </div>

  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="brand"><span class="badge-brand">ZAVELA</span> Store Colombia</a>
      <nav class="nav-links">
        <a href="/" class="nav-link">Inicio</a>

        <!-- Dropdown de Catálogo mediante CSS puro (SEO & Sin JavaScript) -->
        <div class="nav-dropdown-wrapper">
          <a href="/catalogo" class="nav-link active" aria-haspopup="true">
            <span>Catálogo</span>
            <span>▼</span>
          </a>

          <div class="pure-css-dropdown" role="menu">
            <div class="dropdown-mega-layout">
              <div class="dropdown-categories-col">
                <div class="dropdown-heading">
                  <span>📦</span>
                  <span>Nuestras Categorías</span>
                </div>
                <div class="dropdown-grid">
                  <?php foreach ($navCategories as $nc): 
                    $ncSlug = !empty($nc['slug']) ? $nc['slug'] : $nc['name'];
                    $ncName = preg_replace('/[\x{1F300}-\x{1F9FF}]/u', '', $nc['name']);
                  ?>
                    <a href="/catalogo?categoria=<?= urlencode($ncSlug) ?>" class="dropdown-cat-card">
                      <span>🛍️</span>
                      <div class="cat-card-info">
                        <span class="cat-card-title"><?= htmlspecialchars(trim($ncName)) ?></span>
                        <span class="cat-card-count">Ver colección</span>
                      </div>
                    </a>
                  <?php endforeach; ?>
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

  <main class="container">
    <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.25rem;">Catálogo Oficial de Productos</h1>
    <p style="color: #64748b; font-size: 0.95rem;">Disponibles para despacho nacional con Pago Contra Entrega (Total: <?= $totalProducts ?>)</p>

    <div class="grid">
      <?php if (!empty($products)): ?>
        <?php foreach ($products as $p): 
          $slug = !empty($p['slug']) ? $p['slug'] : $p['id'];
          $name = $p['nombre'] ?? $p['title'] ?? 'Producto Zavela';
          $price = (float)($p['precio'] ?? $p['price'] ?? 0);
          $desc = $p['descripcion'] ?? $p['description'] ?? '';
          $cat = $p['categoria'] ?? $p['category'] ?? 'General';
          $img = !empty($p['imagen']) ? $p['imagen'] : (!empty($p['image']) ? $p['image'] : '/images/logo-zavela.jpg');
          $waMsg = urlencode("¡Hola Zavela Store! Deseo pedir el producto '{$name}' con Pago Contra Entrega.");
        ?>
        <article class="card">
          <a href="/producto/<?= htmlspecialchars($slug) ?>">
            <img src="<?= htmlspecialchars($img) ?>" alt="<?= htmlspecialchars($name) ?>" class="card-img" loading="lazy">
          </a>
          <div class="card-body">
            <span class="cat"><?= htmlspecialchars($cat) ?></span>
            <h2 class="title"><a href="/producto/<?= htmlspecialchars($slug) ?>"><?= htmlspecialchars($name) ?></a></h2>
            <p class="desc"><?= htmlspecialchars(cleanMeta($desc, 100)) ?></p>
            <div class="price"><?= formatCOP($price) ?></div>
            <a href="/producto/<?= htmlspecialchars($slug) ?>" class="btn btn-view">Ver Detalles</a>
            <a href="https://wa.me/<?= $whatsappNum ?>?text=<?= $waMsg ?>" target="_blank" class="btn btn-wa">Pedir por WhatsApp</a>
          </div>
        </article>
        <?php endforeach; ?>
      <?php else: ?>
        <p style="padding: 2rem; background: white; border-radius: 12px; grid-column: 1/-1; text-align: center;">No hay productos disponibles en este momento.</p>
      <?php endif; ?>
    </div>

    <?php if ($totalPages > 1): ?>
    <div class="pagination">
      <?php if ($page > 1): ?><a href="/catalogo?page=<?= $page - 1 ?>" class="page-btn">← Anterior</a><?php endif; ?>
      <span>Página <strong><?= $page ?></strong> de <strong><?= $totalPages ?></strong></span>
      <?php if ($page < $totalPages): ?><a href="/catalogo?page=<?= $page + 1 ?>" class="page-btn">Siguiente →</a><?php endif; ?>
    </div>
    <?php endif; ?>
  </main>
</body>
</html>
