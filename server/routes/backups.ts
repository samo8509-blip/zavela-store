import { Router } from 'express';
import { pool } from '../mysqlPool.ts';
import { db } from '../db.ts';
import { dropiBackupService } from '../services/dropiBackupService.ts';

const router = Router();

// Garantizar que la tabla catalogo_backups exista
async function ensureBackupsTable(pool: any) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogo_backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        nombre_respaldo VARCHAR(255) NULL,
        total_productos INT NOT NULL DEFAULT 0,
        snapshot_json LONGTEXT NOT NULL,
        datos_json LONGTEXT NULL,
        origen VARCHAR(50) DEFAULT 'manual',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (err: any) {
    console.warn('[Backups ensure table warning]:', err.message);
  }
}

// 1. GET /api/backups (y /api/admin/backups) - Listar todos los respaldos en MySQL cPanel
router.get(['/', '/list'], async (req, res) => {
  try {
    await ensureBackupsTable(pool);

    let rows: any[] = [];
    try {
      const [sqlRows]: any = await pool.query(
        'SELECT id, nombre, nombre_respaldo, total_productos, origen, created_at FROM catalogo_backups ORDER BY id DESC'
      );
      if (Array.isArray(sqlRows) && sqlRows.length > 0) {
        rows = sqlRows;
      }
    } catch {
      // Fallback a catalog_backups si existía con ese nombre
      try {
        const [altRows]: any = await pool.query(
          'SELECT id, nombre_respaldo, total_productos, origen, created_at FROM catalog_backups ORDER BY id DESC'
        );
        if (Array.isArray(altRows)) rows = altRows;
      } catch {}
    }

    // Si aún está vacío, revisar copias en memoria
    if (rows.length === 0) {
      rows = db.getCatalogBackups().map(b => ({
        id: b.id,
        nombre: b.nombre_respaldo || `Respaldo #${b.id}`,
        nombre_respaldo: b.nombre_respaldo || `Respaldo #${b.id}`,
        total_productos: b.total_productos,
        origen: b.origen || 'local',
        created_at: b.created_at
      }));
    }

    const formatted = rows.map((r: any) => ({
      id: Number(r.id),
      nombre: r.nombre || r.nombre_respaldo || `Respaldo #${r.id}`,
      nombre_respaldo: r.nombre_respaldo || r.nombre || `Respaldo #${r.id}`,
      total_productos: Number(r.total_productos) || 0,
      origen: r.origen || 'manual',
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));

    res.json({
      success: true,
      count: formatted.length,
      backups: formatted,
      data: formatted
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. POST /api/backups (y /api/admin/backups/create) - Crear respaldo instantáneo de la tabla productos
router.post(['/', '/create'], async (req, res) => {
  try {
    await ensureBackupsTable(pool);

    // 1. Leer todos los productos actuales con todas sus columnas físicas
    let productsSnapshot: any[] = [];
    try {
      const [sqlProducts]: any = await pool.query('SELECT * FROM productos ORDER BY id ASC');
      if (Array.isArray(sqlProducts) && sqlProducts.length > 0) {
        productsSnapshot = sqlProducts;
      } else {
        const [altProducts]: any = await pool.query('SELECT * FROM products ORDER BY id ASC');
        if (Array.isArray(altProducts) && altProducts.length > 0) {
          productsSnapshot = altProducts;
        }
      }
    } catch (err: any) {
      console.warn('[Backup read error]:', err.message);
    }

    // Si la base física no tiene productos, usar memoria
    if (productsSnapshot.length === 0) {
      productsSnapshot = db.getProducts();
    }

    const totalProductos = productsSnapshot.length;
    const now = new Date();
    const fechaLegible = now.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    const horaLegible = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const nombre = (req.body.nombre || req.body.nombre_respaldo || req.body.name || `Respaldo Catálogo (${totalProductos} prod.) - ${fechaLegible} ${horaLegible}`).trim();
    const origen = req.body.origen || 'manual';
    const snapshotJson = JSON.stringify(productsSnapshot);

    // 2. Insertar en MySQL tabla catalogo_backups
    let insertId = Date.now();
    try {
      const [result]: any = await pool.query(`
        INSERT INTO catalogo_backups (nombre, nombre_respaldo, total_productos, snapshot_json, datos_json, origen) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [nombre, nombre, totalProductos, snapshotJson, snapshotJson, origen]);
      if (result?.insertId) {
        insertId = result.insertId;
      }
    } catch (err: any) {
      console.warn('[MySQL Insert catalogo_backups error, trying catalog_backups]:', err.message);
      try {
        const [resultAlt]: any = await pool.query(`
          INSERT INTO catalog_backups (nombre_respaldo, total_productos, datos_json, origen) 
          VALUES (?, ?, ?, ?)
        `, [nombre, totalProductos, snapshotJson, origen]);
        if (resultAlt?.insertId) insertId = resultAlt.insertId;
      } catch {}
    }

    // 3. Guardar también en db local como contingencia
    db.saveCatalogBackup({
      nombre_respaldo: nombre,
      total_productos: totalProductos,
      datos_json: snapshotJson,
      origen
    });

    const backupObj = {
      id: insertId,
      nombre,
      nombre_respaldo: nombre,
      total_productos: totalProductos,
      origen,
      created_at: now.toISOString()
    };

    res.status(201).json({
      success: true,
      message: `Respaldo #${insertId} generado exitosamente en MySQL cPanel con ${totalProductos} productos.`,
      backup: backupObj,
      data: backupObj
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. POST /api/backups/:id/restore - Restaurar catálogo desde snapshot_json
router.post('/:id/restore', async (req, res) => {
  const { id } = req.params;
  try {
    await ensureBackupsTable(pool);

    let backupRow: any = null;

    try {
      const [rows]: any = await pool.query(
        'SELECT id, nombre, nombre_respaldo, total_productos, snapshot_json, datos_json, origen, created_at FROM catalogo_backups WHERE id = ? LIMIT 1',
        [id]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        backupRow = rows[0];
      }
    } catch {}

    if (!backupRow) {
      try {
        const [altRows]: any = await pool.query(
          'SELECT id, nombre_respaldo, total_productos, datos_json, origen, created_at FROM catalog_backups WHERE id = ? LIMIT 1',
          [id]
        );
        if (Array.isArray(altRows) && altRows.length > 0) {
          backupRow = altRows[0];
        }
      } catch {}
    }

    if (!backupRow) {
      backupRow = db.getCatalogBackups().find(b => b.id === Number(id));
    }

    if (!backupRow) {
      return res.status(404).json({ success: false, message: `Respaldo con ID ${id} no encontrado en MySQL.` });
    }

    const rawJson = backupRow.snapshot_json || backupRow.datos_json || backupRow.snapshot;
    let productsToRestore: any[] = [];

    if (typeof rawJson === 'string') {
      try {
        productsToRestore = JSON.parse(rawJson);
      } catch (e: any) {
        return res.status(500).json({ success: false, message: 'El snapshot del respaldo tiene formato JSON inválido.' });
      }
    } else if (Array.isArray(rawJson)) {
      productsToRestore = rawJson;
    }

    if (!Array.isArray(productsToRestore)) {
      return res.status(400).json({ success: false, message: 'El contenido del respaldo no contiene un arreglo de productos.' });
    }

    let restoredCount = 0;

    // Restaurar cada producto en la tabla física `productos` de MySQL cPanel
    for (const item of productsToRestore) {
      const prodId = String(item.id || item.codigo || item.sku || `restored-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`);
      const title = String(item.nombre || item.title || item.name || 'Producto Restaurado').trim();
      const price = Number(item.precio !== undefined ? item.precio : (item.price || 0)) || 0;
      const supplierCost = Number(item.supplier_cost !== undefined ? item.supplier_cost : (item.costPrice || 0)) || 0;
      const suggestedPrice = Number(item.suggested_price !== undefined ? item.suggested_price : (item.compareAtPrice || 0)) || (price > 0 ? Math.round(price * 1.35) : 0);
      const stock = Number(item.stock !== undefined ? item.stock : 10);
      const description = String(item.descripcion !== undefined ? item.descripcion : (item.description || ''));

      let category = item.categoria || item.category || item.categoryName || 'General';
      let categoryId = item.category_id || item.categoryId || item.categoria_id || 'cat-general';
      const dropiProductId = item.dropi_product_id ? String(item.dropi_product_id).trim() : (item.dropiProductId ? String(item.dropiProductId).trim() : '');
      const provider = item.provider || (dropiProductId ? 'dropi' : 'direct');
      const supplier = item.supplier || (dropiProductId ? 'Dropi Colombia' : 'Bodega Directa');
      const supplierSku = item.supplier_sku || item.supplierSku || null;

      let images: string[] = [];
      if (Array.isArray(item.imagenes)) images = item.imagenes;
      else if (Array.isArray(item.images)) images = item.images;
      else if (typeof item.imagenes === 'string' && item.imagenes.trim()) {
        try { images = JSON.parse(item.imagenes); } catch { images = [item.imagenes]; }
      } else if (typeof item.images === 'string' && item.images.trim()) {
        try { images = JSON.parse(item.images); } catch { images = [item.images]; }
      } else if (item.imagen) images = [item.imagen];
      else if (item.image) images = [item.image];

      const mainImage = images.length > 0 ? images[0] : (item.imagen || item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800');
      const imagesJson = JSON.stringify(images.length > 0 ? images : [mainImage]);
      const isActive = item.active !== undefined 
        ? (item.active === 1 || item.active === true || item.active === '1' || item.status === 'active' || item.estado === 'activo' ? 1 : 0)
        : 1;

      try {
        await pool.query(`
          INSERT INTO productos (
            id, nombre, precio, supplier_cost, suggested_price, stock, descripcion,
            categoria, category, category_id, dropi_product_id, provider, supplier, supplier_sku,
            imagen, imagenes, active, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            precio = VALUES(precio),
            supplier_cost = VALUES(supplier_cost),
            suggested_price = VALUES(suggested_price),
            stock = VALUES(stock),
            descripcion = VALUES(descripcion),
            categoria = VALUES(categoria),
            category = VALUES(category),
            category_id = VALUES(category_id),
            dropi_product_id = VALUES(dropi_product_id),
            provider = VALUES(provider),
            supplier = VALUES(supplier),
            supplier_sku = VALUES(supplier_sku),
            imagen = VALUES(imagen),
            imagenes = VALUES(imagenes),
            active = VALUES(active),
            updated_at = NOW()
        `, [
          prodId, title, price, supplierCost, suggestedPrice, stock, description,
          category, category, categoryId, dropiProductId, provider, supplier, supplierSku,
          mainImage, imagesJson, isActive
        ]);

        // Asegurar persistencia explícita de columnas categoria y category en MySQL
        await pool.query(`
          UPDATE productos SET 
            categoria = ?, 
            category = ?, 
            category_id = ? 
          WHERE id = ?
        `, [category, category, categoryId, prodId]).catch(() => {});

        restoredCount++;

        // Persistir también en tabla products para compatibilidad
        await pool.query(`
          INSERT INTO products (
            id, title, price, supplier_cost, suggested_price, stock, description,
            category, category_id, dropi_product_id, provider, supplier, supplier_sku,
            image, images, active, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            price = VALUES(price),
            supplier_cost = VALUES(supplier_cost),
            suggested_price = VALUES(suggested_price),
            stock = VALUES(stock),
            description = VALUES(description),
            category = VALUES(category),
            category_id = VALUES(category_id),
            dropi_product_id = VALUES(dropi_product_id),
            provider = VALUES(provider),
            supplier = VALUES(supplier),
            supplier_sku = VALUES(supplier_sku),
            image = VALUES(image),
            images = VALUES(images),
            active = VALUES(active),
            updated_at = NOW()
        `, [
          prodId, title, price, supplierCost, suggestedPrice, stock, description,
          category, categoryId, dropiProductId, provider, supplier, supplierSku,
          mainImage, imagesJson, isActive
        ]).catch(() => {});

        // Proteger dropi_product_id en dropiBackupService
        if (dropiProductId) {
          dropiBackupService.saveDropiId(prodId, dropiProductId);
        }

        // Sincronizar en data_store local
        db.saveProduct({
          id: prodId,
          title,
          slug: item.slug || prodId,
          description,
          shortDescription: item.shortDescription || '',
          price,
          costPrice: supplierCost,
          compareAtPrice: suggestedPrice,
          discountPercentage: item.discountPercentage || 0,
          marginAmount: item.marginAmount || 0,
          marginPercentage: item.marginPercentage || 0,
          stock,
          active: Boolean(isActive),
          featured: Boolean(item.featured),
          images: images.length > 0 ? images : [mainImage],
          warrantyInfo: item.warrantyInfo || '30 días de garantía oficial Zavela Store.',
          tags: Array.isArray(item.tags) ? item.tags : ['tendencia'],
          weightKg: item.weightKg || 0.5,
          categoryId,
          categoryName: category,
          category,
          categoria: category,
          categoria_id: categoryId,
          warehouseCity: item.warehouseCity || 'Bogotá D.C.',
          brand: item.brand || 'Zavela Store',
          dropi_product_id: dropiProductId,
          variants: Array.isArray(item.variants) ? item.variants : [],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (err: any) {
        console.warn(`[Restore error on product ${prodId}]:`, err.message);
      }
    }

    res.json({
      success: true,
      message: `¡Restauración exitosa! Se restauraron ${restoredCount} productos en MySQL cPanel.`,
      restoredCount,
      totalProductos: productsToRestore.length
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. DELETE /api/backups/:id - Eliminar respaldo
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await ensureBackupsTable(pool);

    try {
      await pool.query('DELETE FROM catalogo_backups WHERE id = ?', [id]);
    } catch {}
    try {
      await pool.query('DELETE FROM catalog_backups WHERE id = ?', [id]);
    } catch {}

    db.deleteCatalogBackup(Number(id));

    res.json({ success: true, message: `Respaldo #${id} eliminado con éxito.` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
