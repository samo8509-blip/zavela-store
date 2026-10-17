// POST /api/products/bulk-import
router.post('/bulk-import', async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'No se enviaron productos para importar' });
    }

    const savedProducts: any[] = [];
    const backupEntries: Record<string, string> = {};

    for (const item of products) {
      const id = item.id || `prod-dropi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const name = item.name || item.title || 'Producto Dropi';
      const slug = item.slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const price = Number(item.price || item.suggested_price || 0);
      const costPrice = Number(item.cost_price || item.costPrice || 0);
      const suggestedPrice = Number(item.suggested_price || price);
      const dropiProductId = String(item.dropi_product_id || item.numeric_id || '').trim();
      const description = item.description || '';
      const stock = Number(item.stock || 50);
      const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
      const imagesJson = JSON.stringify(images);
      const mainImage = images[0];

      // ¡AQUÍ ESTÁ LA CLAVE! Leer el flete que viene de Dropi
      const rawShipping = item.shippingCost ?? item.shipping_cost ?? item.flete ?? item.flete_envio ?? item.estimatedShippingCost;
      const parsedShipping = typeof rawShipping === 'string' ? parseFloat(rawShipping.replace(/[^0-9.]/g, '')) : Number(rawShipping);
      const shippingCost = (!isNaN(parsedShipping) && parsedShipping >= 0) ? parsedShipping : 16500;

      if (dropiProductId) {
        backupEntries[id] = dropiProductId;
        dropiBackupService.saveDropiId(id, dropiProductId);
      }

      // Guardar en la tabla products de MySQL cPanel
      await pool.query(`
        INSERT INTO products (
          id, title, name, slug, price, supplier_cost, suggested_price, stock, description, dropi_product_id, provider, supplier, shipping_cost, flete_envio, flete, images, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dropi', 'Dropi Colombia', ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          name = VALUES(name),
          price = VALUES(price),
          supplier_cost = VALUES(supplier_cost),
          suggested_price = VALUES(suggested_price),
          stock = VALUES(stock),
          description = VALUES(description),
          dropi_product_id = VALUES(dropi_product_id),
          shipping_cost = VALUES(shipping_cost),
          flete_envio = VALUES(flete_envio),
          flete = VALUES(flete),
          images = VALUES(images),
          updated_at = NOW()
      `, [id, name, name, slug, price, costPrice, suggestedPrice, stock, description, dropiProductId || null, shippingCost, shippingCost, shippingCost, imagesJson]);

      // Guardar en la tabla productos de MySQL cPanel
      try {
        await pool.query(`
          INSERT INTO productos (
            id, nombre, precio, supplier_cost, suggested_price, stock, descripcion, dropi_product_id, provider, supplier, shipping_cost, flete_envio, flete, imagen, imagenes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dropi', 'Dropi Colombia', ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            precio = VALUES(precio),
            supplier_cost = VALUES(supplier_cost),
            suggested_price = VALUES(suggested_price),
            stock = VALUES(stock),
            descripcion = VALUES(descripcion),
            dropi_product_id = VALUES(dropi_product_id),
            shipping_cost = VALUES(shipping_cost),
            flete_envio = VALUES(flete_envio),
            flete = VALUES(flete),
            imagen = VALUES(imagen),
            imagenes = VALUES(imagenes),
            updated_at = NOW()
        `, [id, name, price, costPrice, suggestedPrice, stock, description, dropiProductId || null, shippingCost, shippingCost, shippingCost, mainImage, imagesJson]);
      } catch {}

      const prodRecord = {
        id,
        title: name,
        slug,
        price,
        costPrice,
        supplier_cost: costPrice,
        compareAtPrice: suggestedPrice,
        suggested_price: suggestedPrice,
        stock,
        description,
        dropi_product_id: dropiProductId,
        dropiProductId: dropiProductId,
        provider: 'dropi',
        supplier: 'Dropi Colombia',
        shippingCost: shippingCost,
        shipping_cost: shippingCost,
        flete_envio: shippingCost,
        flete: shippingCost,
        estimatedShippingCost: shippingCost,
        image: mainImage,
        images,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.saveProduct(prodRecord as any);
      savedProducts.push(prodRecord);
    }

    if (Object.keys(backupEntries).length > 0) {
      dropiBackupService.saveBulk(backupEntries);
    }

    res.status(201).json({
      success: true,
      count: savedProducts.length,
      data: savedProducts,
      message: `Se importaron ${savedProducts.length} productos con persistencia real en MySQL.`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
