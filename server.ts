import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import productsRouter, { searchProductForBot } from './server/routes/products.ts';
import legalRouter from './server/routes/legal.ts';
import newsletterRouter from './server/routes/newsletter.ts';
import shippingRouter from './server/routes/shipping.ts';
import tiktokRouter from './server/routes/tiktok.ts';
import metricsRouter from './server/routes/metrics.ts';
import ordersRouter from './server/routes/orders.ts';
import adminRouter from './server/routes/admin.ts';
import aiRouter from './server/routes/ai.ts';
import whatsappRouter from './server/routes/whatsapp.ts';
import wavyWebhookRouter from './server/routes/wavyWebhook.ts';
import alertsRouter from './server/routes/alerts.ts';
import { apiGuard, secretSource } from './server/middleware/apiGuard.ts';
import customersRouter from './server/routes/customers.ts';
import advisorsRouter from './server/routes/advisors.ts';
import handoffLinkRouter from './server/routes/handoffLink.ts';
import paymentsRouter from './server/routes/payments.ts';
import dropiRouter from './server/routes/dropi.ts';
import backupsRouter from './server/routes/backups.ts';
import priceSuggestionRouter from './server/routes/priceSuggestion.ts';
import campaignRouter from './server/routes/campaign.ts';
import { loadCampaign, autoEndIfDue } from './server/services/campaign.ts';
import { authRouter } from './server/routes/auth.ts';
import { cpanelDbService } from './server/services/cpanelDbService.ts';
import { db, isTestProduct } from './server/db.ts';
import { initDatabaseSchema, runAutoMigrations } from './server/mysqlPool.ts';
import { runCleanupAndDisableSeeders } from './server/services/seeder.ts';
import { ssrService } from './server/services/ssrService.ts';
import { loadPrivateConfig, ensureTokenSecret } from './server/services/privateConfig.ts';
import { loadAdvisors } from './server/services/advisorStore.ts';
import { loadSales } from './server/services/advisorSalesStore.ts';
import { loadSettlements } from './server/services/payouts.ts';

dotenv.config();

async function startServer() {
  // 1. Auto-migración y verificación de esquema MySQL al iniciar (cero intervención manual)
  await initDatabaseSchema().catch(err => {
    console.error('[Server Startup Auto-Migration Error]:', err.message);
  });

  // 1b. Configuración privada (SMTP, clave de sesiones) guardada en MySQL
  await loadPrivateConfig();
  await ensureTokenSecret();
  await loadAdvisors();
  await loadSales();
  await loadSettlements();

  // 2. Desactivación definitiva de seeders y limpieza de datos demo recurrentes
  await runCleanupAndDisableSeeders().catch(err => {
    console.warn('[Server Startup Seeder Cleanup Warning]:', err.message);
  });

  const app = express();
  const PORT = 3000;

  // ── Seguridad de conexión ──────────────────────────────────────────────────
  // Render termina el HTTPS delante del servidor y avisa con x-forwarded-proto.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const host = String(req.headers.host || '');
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    // Forzar HTTPS: si alguien entra por http:// se le redirige a https:// (no aplica a pruebas locales ni al chequeo de salud)
    if (proto === 'http' && !local && req.path !== '/api/health') {
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    if (proto === 'https') res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains'); // 6 meses
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)'); // el micrófono se usa al grabar la voz de los videos
    next();
  });

  // Middlewares - Support large image uploads (base64)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Zavela Store API',
      timestamp: new Date().toISOString(),
      country: 'CO',
      uptimeSeconds: Math.round(process.uptime()),
      tokenSecretSource: secretSource
    });
  });

  // Candado de la API (sesiones firmadas y rutas públicas permitidas)
  app.use('/api', apiGuard);

  // Mount API Endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/admin-login', authRouter);
  app.use('/api/backups', backupsRouter);
  app.use('/api/admin/backups', backupsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin/price-suggestion', priceSuggestionRouter);
  app.use('/api/admin/campaign', campaignRouter);
  app.use('/api/admin', adminRouter);
  // Soporte directo para /api/categories (GET, POST, PUT, DELETE)
  app.use('/api/categories', (req, res, next) => {
    req.url = '/categories' + (req.url === '/' ? '' : req.url);
    adminRouter(req, res, next);
  });
  app.use('/api/ai', aiRouter);
  app.use('/api/commercemind', aiRouter);
  app.use('/commercemind', aiRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/webhook/whatsapp', whatsappRouter);
  app.use('/webhook/whatsapp', whatsappRouter);
  app.use('/webhook', whatsappRouter);
  app.use('/api/wavy-webhook', wavyWebhookRouter);
  app.use('/api/webhook/wavy', wavyWebhookRouter);
  app.use('/wavy-webhook', wavyWebhookRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/advisors', advisorsRouter);
  app.use('/hablar-con-asesor', handoffLinkRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/dropi', dropiRouter);

  // Soporte directo para endpoints de pedidos en api.php
  app.all(['/api.php', '/api/api.php'], (req, res, next) => {
    const action = String(req.query.action || '').toLowerCase();
    const body = req.body || {};
    const isOrderAction = 
      action === 'update_status' || 
      action === 'modificar_pedido' || 
      action === 'actualizar_guia' ||
      body.numero_guia !== undefined || 
      body.transportadora !== undefined || 
      body.cedula !== undefined;

    if (isOrderAction && req.method === 'POST') {
      try {
        const orderId = String(body.id || body.orderId || req.query.id || req.query.orderId || '').trim();
        if (orderId) {
          const order = db.getOrderById(orderId);
          if (order) {
            const updated = db.saveOrder({
              ...order,
              ...body,
              id: order.id,
              carrier: body.transportadora || body.carrier || order.carrier,
              trackingNumber: body.numero_guia || body.guia || body.trackingNumber || order.trackingNumber,
              cedula: body.cedula || order.cedula,
              status: body.estado || body.status || order.status
            });
            return res.json({ success: true, status: 'ok', message: 'Pedido y guía actualizados correctamente', data: updated });
          }
        }
        return res.json({ success: true, status: 'ok', message: 'Acción de pedido procesada con éxito' });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }
    // Soporte para DELETE de pedidos en api.php
    if (req.method === 'DELETE' || action === 'delete' || action === 'eliminar_pedido') {
      try {
        const orderId = String(req.query.id || req.query.orderId || body.id || body.orderId || '').trim();
        if (orderId) {
          db.deleteOrder(orderId);
        }
        return res.json({ success: true, message: 'Pedido eliminado correctamente' });
      } catch (delErr: any) {
        return res.status(500).json({ success: false, error: delErr.message });
      }
    }

    next();
  });

  // Soporte directo para API Webhook de consulta de productos para WAI y bots de WhatsApp
  const handleBotProductRequest = async (req: express.Request, res: express.Response) => {
    try {
      const query = (req.query.producto || req.query.q || req.query.nombre || req.query.search || req.query.query ||
                     req.body?.producto || req.body?.q || req.body?.nombre || req.body?.query || req.body?.message || req.body?.text || '') as string;
      const result = await searchProductForBot(query);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(500).json({ encontrado: false, error: err.message, tienda: 'Zavela Store Colombia' });
    }
  };

  app.all([
    '/api-productos.php', 
    '/api/api-productos.php', 
    '/cpanel-api/api-productos.php',
    '/api/bot/producto',
    '/api/bot/productos'
  ], handleBotProductRequest);

  // Endpoint de descarga de catálogo en texto plano .txt para Agente de IA (WAI)
  app.get(['/export_catalogo_wai.php', '/catalogo_wai.txt', '/api/export_catalogo_wai.php'], async (req, res) => {
    try {
      const baseUrl = 'https://zavelastore.com.co';
      const allProducts = await ssrService.getActiveProductsFromDb();

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="catalogo_wai.txt"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const lines = allProducts
        .filter(p => !isTestProduct(p))
        .map(p => {
          const name = (p.title || (p as any).nombre || 'Producto Zavela').trim();
          const price = Math.round(p.price || (p as any).precio || 0);
          const priceFormatted = `$${price.toLocaleString('es-CO')} COP`;
          const slug = p.slug || p.id || 'producto';
          return `${name} | Precio: ${priceFormatted} | Enlace: ${baseUrl}/producto/${slug} | Enlace de compra: ${baseUrl}/?producto=${encodeURIComponent(slug)}&comprar=1 | Código: ${slug}`;
        });

      res.send(lines.join('\n'));
    } catch (e: any) {
      console.error('[Export Catalogo WAI Error]:', e);
      res.status(500).send('Error exportando catálogo');
    }
  });

  // Soporte directo para convenciones de URLs PHP de cPanel MySQL
  app.use('/api/products.php', productsRouter);
  app.use('/api.php', productsRouter);
  app.use('/products.php', productsRouter);
  app.use('/cpanel-api/products.php', productsRouter);
  app.all('/api/products_batch.php', async (req, res) => {
    try {
      const { action, ids, active } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Se requiere una lista de IDs de productos' });
      }

      if (action === 'delete') {
        cpanelDbService.batchDeleteProducts(ids).catch(() => {});
        for (const id of ids) {
          db.deleteProduct(id);
        }
        return res.json({ success: true, message: `Se eliminaron ${ids.length} productos de MySQL`, deletedCount: ids.length });
      } else {
        const status = active !== false;
        cpanelDbService.batchUpdateProductStatus(ids, status).catch(() => {});
        for (const id of ids) {
          const p = db.getProductById(id);
          if (p) db.saveProduct({ ...p, active: status });
        }
        return res.json({ success: true, message: `Se actualizó el estado de ${ids.length} productos en MySQL`, affectedCount: ids.length });
      }
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // =========================================================================
  // 🗺️ SEO & SSR: Sitemap XML, Robots TXT, Catálogo HTML y Producto SSR
  // =========================================================================

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'zavelastore.com.co';
      const baseUrl = `${forwardedProto}://${host}`;
      const xml = await ssrService.generateSitemapXml(baseUrl);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (err: any) {
      console.error('[Sitemap XML Error]:', err);
      res.status(500).send('Error generando sitemap.xml');
    }
  });

  app.get('/robots.txt', (req, res) => {
    try {
      const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'zavelastore.com.co';
      const baseUrl = `${forwardedProto}://${host}`;
      const txt = ssrService.generateRobotsTxt(baseUrl);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(txt);
    } catch (err: any) {
      console.error('[Robots TXT Error]:', err);
      res.status(500).send('User-agent: *\nAllow: /\n');
    }
  });

  // Páginas legales públicas (términos, privacidad, garantías, cookies, derechos sobre datos)
  app.use(legalRouter);
  app.use(newsletterRouter);
  app.use(shippingRouter);
  app.use(tiktokRouter);
  app.use(metricsRouter);

  // Página /catalogo en HTML simple (sin JS dependiente) con paginación
  app.get(['/catalogo', '/catalogo/'], async (req, res) => {
    try {
      const html = await ssrService.renderCatalogPage(req);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(html);
    } catch (err: any) {
      console.error('[SSR Catalogo Error]:', err);
      res.status(500).send('Error generando página de catálogo');
    }
  });

  // Página individual de producto SSR con OpenGraph, Schema.org y HTML real
  app.get(['/producto/:identifier', '/producto/:identifier/'], async (req, res, next) => {
    const identifier = req.params.identifier;
    // Omitir si es un asset estático (ej. js, css, svg, png)
    if (identifier.includes('.')) {
      return next();
    }

    try {
      const html = await ssrService.renderProductPage(req, identifier);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(html);
    } catch (err: any) {
      console.error('[SSR Producto Error]:', err);
      res.status(500).send('Error generando página de producto');
    }
  });

  // Soporte para URLs con parámetro query (/producto?id=prod-1793405803457)
  app.get(['/producto', '/producto/'], async (req, res) => {
    const id = (req.query.id || req.query.slug) as string | undefined;
    if (id && typeof id === 'string') {
      try {
        const html = await ssrService.renderProductPage(req, id);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.send(html);
      } catch (err: any) {
        console.error('[SSR Producto Query Error]:', err);
        return res.status(500).send('Error generando página de producto');
      }
    }
    return res.redirect('/catalogo');
  });

  // Helper to inject initial categories into index.html for instant Navbar rendering
  const injectInitialCategoriesIntoHtml = async (html: string): Promise<string> => {
    try {
      const categories = await ssrService.getActiveCategoriesFromDb();
      if (categories && categories.length > 0) {
        const scriptTag = `<script id="server-injected-categories">window.__INITIAL_CATEGORIES__ = ${JSON.stringify(categories)};</script>`;
        return html.replace('</head>', `  ${scriptTag}\n  </head>`);
      }
    } catch (e: any) {
      console.warn('[Server Categories Injection Warning]:', e?.message);
    }
    return html;
  };

  // Vite middleware for development & Static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    // Inyectar categorías iniciales en la carga del HTML principal
    app.use(async (req, res, next) => {
      const url = req.originalUrl;
      if (req.method === 'GET' && (url === '/' || url.startsWith('/?'))) {
        try {
          const template = await fs.promises.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
          let html = await vite.transformIndexHtml(url, template);
          html = await injectInitialCategoriesIntoHtml(html);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.status(200).send(html);
        } catch (e) {
          return next(e);
        }
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Los archivos con huella en el nombre (/assets/...) se guardan un año; el resto (index.html, etc.)
    // siempre se revalida para que cada despliegue llegue a los navegadores sin Ctrl+F5.
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (/[\\/]assets[\\/]/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else res.setHeader('Cache-Control', 'no-cache');
      }
    }));
    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) {
        return next();
      }
      try {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const rawHtml = await fs.promises.readFile(indexPath, 'utf-8');
          const html = await injectInitialCategoriesIntoHtml(rawHtml);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.status(200).send(html);
        }
      } catch (e) {
        // Fallback standard
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno del servidor', message: err?.message || 'Internal Server Error' });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zavela Store backend running at http://0.0.0.0:${PORT}`);
  });

  // Campaña de precios: carga su estado y termina sola cuando pasa la fecha de fin
  loadCampaign().then(() => autoEndIfDue()).catch(() => {});
  setInterval(() => { autoEndIfDue().catch(() => {}); }, 10 * 60 * 1000);

  const customPort = process.env.PORT && process.env.PORT !== '3000' && process.env.PORT !== '8080'
    ? Number(process.env.PORT)
    : null;

  let secondaryServer: any = null;
  if (customPort && !isNaN(customPort)) {
    try {
      secondaryServer = app.listen(customPort, '0.0.0.0', () => {
        console.log(`Zavela Store custom listener activo en http://0.0.0.0:${customPort}`);
      });
      secondaryServer.on('error', (err: any) => {
        console.warn(`[Port ${customPort} Notice]:`, err?.message || err);
      });
    } catch (e: any) {
      console.warn(`[Port ${customPort} Notice]:`, e?.message || e);
    }
  }

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed.');
    });
    if (secondaryServer) {
      secondaryServer.close();
    }
  });
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

