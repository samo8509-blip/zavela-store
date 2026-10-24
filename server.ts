import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import productsRouter from './server/routes/products.ts';
import ordersRouter from './server/routes/orders.ts';
import adminRouter from './server/routes/admin.ts';
import aiRouter from './server/routes/ai.ts';
import whatsappRouter from './server/routes/whatsapp.ts';
import alertsRouter from './server/routes/alerts.ts';
import customersRouter from './server/routes/customers.ts';
import advisorsRouter from './server/routes/advisors.ts';
import paymentsRouter from './server/routes/payments.ts';
import dropiRouter from './server/routes/dropi.ts';
import backupsRouter from './server/routes/backups.ts';
import { authRouter } from './server/routes/auth.ts';
import { cpanelDbService } from './server/services/cpanelDbService.ts';
import { db } from './server/db.ts';
import { initDatabaseSchema, runAutoMigrations } from './server/mysqlPool.ts';
import { runCleanupAndDisableSeeders } from './server/services/seeder.ts';

dotenv.config();

async function startServer() {
  // 1. Auto-migración y verificación de esquema MySQL al iniciar (cero intervención manual)
  await initDatabaseSchema().catch(err => {
    console.error('[Server Startup Auto-Migration Error]:', err.message);
  });

  // 2. Desactivación definitiva de seeders y limpieza de datos demo recurrentes
  await runCleanupAndDisableSeeders().catch(err => {
    console.warn('[Server Startup Seeder Cleanup Warning]:', err.message);
  });

  const app = express();
  const PORT = 3000;

  // Middlewares - Support large image uploads (base64)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Zavela Store API',
      timestamp: new Date().toISOString(),
      country: 'CO'
    });
  });

  // Mount API Endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/admin-login', authRouter);
  app.use('/api/backups', backupsRouter);
  app.use('/api/admin/backups', backupsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/commercemind', aiRouter);
  app.use('/commercemind', aiRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/webhook/whatsapp', whatsappRouter);
  app.use('/webhook/whatsapp', whatsappRouter);
  app.use('/webhook', whatsappRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/advisors', advisorsRouter);
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
    next();
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

  // Vite middleware for development & Static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/webhook')) {
        return next();
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

