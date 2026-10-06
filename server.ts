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
import { cpanelDbService } from './server/services/cpanelDbService.ts';
import { db } from './server/db.ts';

dotenv.config();

async function startServer() {
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

  // Soporte directo para convenciones de URLs PHP de cPanel MySQL
  app.use('/api/products.php', productsRouter);
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
    app.get('*', (req, res) => {
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

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
      console.log('HTTP server closed.');
    });
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

