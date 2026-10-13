import mysql from 'mysql2/promise';
import { nativePool } from '../mysqlPool.ts';
import { db } from '../db.ts';

/**
 * Servicio de Limpieza y Blindaje de Datos (Seeder Desactivado Definitivamente)
 * 
 * Reglas Estrictas:
 * 1. NUNCA genera productos de demostración ("Esfera Inflable", "Proyector Laser", etc.).
 * 2. NUNCA genera asesores o usuarios ficticios ("Juan", "Valentina", "Carlos", "andres.castro", etc.).
 * 3. Ejecuta una única pasada de limpieza para eliminar registros de prueba residuales
 *    tanto en MySQL de cPanel como en el almacenamiento persistente local.
 * 4. Mantiene exclusivamente los productos y asesores reales creados o importados por el usuario.
 */
export async function runCleanupAndDisableSeeders(poolInstance?: mysql.Pool | null): Promise<void> {
  const p = poolInstance || nativePool;

  console.log('[Seeder Service] 🛡️ Verificando estado: Seeders automáticos desactivados de forma permanente.');

  // 1. Limpieza en base de datos MySQL (cPanel)
  if (p) {
    try {
      // Eliminar productos de prueba residuales por nombre o patrón de ID
      const testProductNames = [
        '%Esfera Inflable%',
        '%Proyector Laser%',
        '%Producto Prueba%',
        '%test-product%',
        '%prod-test%'
      ];

      for (const pattern of testProductNames) {
        try {
          await p.query('DELETE FROM products WHERE title LIKE ? OR name LIKE ? OR id LIKE ?', [pattern, pattern, pattern]);
          await p.query('DELETE FROM productos WHERE nombre LIKE ? OR id LIKE ?', [pattern, pattern]);
        } catch {}
      }

      // Eliminar asesores demo recurrentes (AS-001 Juan, AS-002 Valentina, AS-003 Carlos, etc.)
      const demoAdvisorIds = ['AS-001', 'AS-002', 'AS-003', 'AS-004', 'AS-005', 'VEN-001', 'VEN-002', 'VEN-003'];
      const demoUsernames = ['juan.perez', 'valentina.morales', 'carlos.gomez', 'daniela.rios', 'andres.castro', 'asesor_adm-008'];

      for (const advId of demoAdvisorIds) {
        try {
          await p.query('DELETE FROM advisors WHERE id = ?', [advId]);
        } catch {}
      }

      for (const uName of demoUsernames) {
        try {
          await p.query('DELETE FROM advisors WHERE username = ? OR email LIKE ?', [uName, `%${uName}%`]);
        } catch {}
      }

      // Eliminar órdenes de prueba simuladas recurrentes (ZV-8677, ZV-8942, Carlos Gómez, etc.)
      const testOrderPatterns = ['%ord-sim-%', '%ord-test-%', '%simulado%'];
      const testOrderNumbers = ['ZV-8677', 'ZV-8942', 'DP-8677', 'DP-8942', 'NV-8677', 'NV-8942'];

      for (const pattern of testOrderPatterns) {
        try {
          await p.query('DELETE FROM orders WHERE id LIKE ?', [pattern]);
          await p.query('DELETE FROM pedidos WHERE id LIKE ?', [pattern]);
        } catch {}
      }

      for (const oNum of testOrderNumbers) {
        try {
          await p.query('DELETE FROM orders WHERE order_number = ?', [oNum]);
          await p.query('DELETE FROM pedidos WHERE order_number = ?', [oNum]);
        } catch {}
      }

      try {
        await p.query("DELETE FROM orders WHERE customer_name LIKE '%Carlos Gomez%' OR customer_name LIKE '%Carlos Gómez%'");
        await p.query("DELETE FROM pedidos WHERE cliente_nombre LIKE '%Carlos Gomez%' OR cliente_nombre LIKE '%Carlos Gómez%'");
      } catch {}

      console.log('[Seeder Service] ✓ Limpieza de registros y órdenes de prueba en MySQL completada con éxito.');
    } catch (err: any) {
      console.warn('[Seeder Service Warning al limpiar MySQL]:', err.message);
    }
  }

  // 2. Limpieza de datos demo en el store local (data_store.json)
  try {
    const demoAdvisorIds = new Set(['AS-001', 'AS-002', 'AS-003', 'AS-004', 'AS-005']);
    const demoUsernames = new Set(['juan.perez', 'valentina.morales', 'carlos.gomez', 'daniela.rios', 'andres.castro']);

    const currentAdvisors = db.getAdvisors();
    const cleanAdvisors = currentAdvisors.filter(adv => {
      if (demoAdvisorIds.has(adv.id)) return false;
      if (adv.username && demoUsernames.has(adv.username)) return false;
      if (adv.name && (adv.name.includes('(Asesor 1)') || adv.name.includes('(Asesora 2)') || adv.name.includes('(Asesor 3)'))) return false;
      return true;
    });

    if (cleanAdvisors.length !== currentAdvisors.length) {
      db.saveAllAdvisors(cleanAdvisors);
      console.log(`[Seeder Service] ✓ Asesores demo eliminados de almacenamiento local (${currentAdvisors.length - cleanAdvisors.length} removidos).`);
    }

    // Filtrar productos demo residuales
    const currentProducts = db.getProducts();
    const cleanProducts = currentProducts.filter(prod => {
      const title = (prod.title || (prod as any).name || '').toLowerCase();
      if (title.includes('esfera inflable') || title.includes('proyector laser') || title.includes('producto prueba')) {
        return false;
      }
      return true;
    });

    if (cleanProducts.length !== currentProducts.length) {
      db.saveAllProducts(cleanProducts);
      console.log(`[Seeder Service] ✓ Productos demo eliminados de almacenamiento local (${currentProducts.length - cleanProducts.length} removidos).`);
    }

    // 3. Purgar órdenes y clientes simulados en almacenamiento local
    const cleanResult = db.cleanTestRecords();
    if (cleanResult.deletedOrders > 0) {
      console.log(`[Seeder Service] ✓ ${cleanResult.deletedOrders} órdenes de prueba eliminadas de data_store.`);
    }
  } catch (err: any) {
    console.warn('[Seeder Service Warning al limpiar data_store]:', err.message);
  }
}

export default {
  runCleanupAndDisableSeeders
};
