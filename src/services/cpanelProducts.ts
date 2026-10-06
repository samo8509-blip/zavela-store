// ==============================================================================
// ZavelaStore - Servicio Cliente de Productos en MySQL (cPanel)
// Reemplazo completo de Cloud Firestore para el Catálogo de Productos
// ==============================================================================

import { Product } from '../types/index.ts';

const API_PRODUCTS_URL = '/api/products.php';
const API_BATCH_URL = '/api/products_batch.php';
const API_ADMIN_PRODUCTS_URL = '/api/admin/products';

/**
 * 1. OBTENER / LISTAR PRODUCTOS DESDE CPANEL MYSQL
 * @param onlyActive Si es true, retorna únicamente productos activos
 */
export async function getCpanelProducts(onlyActive: boolean = false): Promise<Product[]> {
  const url = onlyActive 
    ? `${API_PRODUCTS_URL}?only_active=1`
    : API_PRODUCTS_URL;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      // Intento de fallback a endpoint administrativo
      const adminRes = await fetch(API_ADMIN_PRODUCTS_URL);
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        const list = Array.isArray(adminData.data) ? adminData.data : [];
        return onlyActive ? list.filter((p: Product) => p.active !== false) : list;
      }
      throw new Error(`HTTP ${res.status} al consultar productos de cPanel MySQL`);
    }

    const data = await res.json();
    const list: Product[] = Array.isArray(data.data) 
      ? data.data 
      : (Array.isArray(data) ? data : []);

    return onlyActive ? list.filter(p => p.active !== false) : list;
  } catch (error: any) {
    console.warn('[cPanel MySQL] Error al obtener productos:', error.message);
    // Fallback hacia /api/admin/products
    try {
      const fallbackRes = await fetch(API_ADMIN_PRODUCTS_URL);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const list = Array.isArray(fallbackData.data) ? fallbackData.data : [];
        return onlyActive ? list.filter((p: Product) => p.active !== false) : list;
      }
    } catch {}
    return [];
  }
}

/**
 * 2. GUARDAR / CREAR O ACTUALIZAR PRODUCTO EN CPANEL MYSQL
 */
export async function saveCpanelProduct(productData: Partial<Product>): Promise<Product> {
  const isEdit = Boolean(productData.id);
  const url = isEdit ? `${API_PRODUCTS_URL}?id=${encodeURIComponent(productData.id!)}` : API_PRODUCTS_URL;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    if (!res.ok) {
      // Fallback a endpoint de Express admin si la API PHP directa tuviera problema de proxy
      const adminUrl = isEdit ? `${API_ADMIN_PRODUCTS_URL}/${productData.id}` : API_ADMIN_PRODUCTS_URL;
      const adminMethod = isEdit ? 'PUT' : 'POST';
      const adminRes = await fetch(adminUrl, {
        method: adminMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        return adminData.data || productData;
      }
      throw new Error(`HTTP ${res.status} al guardar en cPanel MySQL`);
    }

    const data = await res.json();
    return data.data || productData;
  } catch (err: any) {
    console.error('[cPanel MySQL] Error al guardar producto:', err);
    throw err;
  }
}

export const createCpanelProduct = saveCpanelProduct;
export const updateCpanelProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  return saveCpanelProduct({ ...updates, id });
};

/**
 * 3. ELIMINAR PRODUCTO (Físico o Soft Delete) EN CPANEL MYSQL
 */
export async function deleteCpanelProduct(id: string, softDelete: boolean = false): Promise<boolean> {
  if (!id) return false;

  if (softDelete) {
    const res = await fetch(`${API_PRODUCTS_URL}?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: false })
    });
    return res.ok;
  }

  try {
    const res = await fetch(`${API_PRODUCTS_URL}?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      // Fallback a admin router
      const adminRes = await fetch(`${API_ADMIN_PRODUCTS_URL}/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return adminRes.ok;
    }
    return true;
  } catch (err: any) {
    console.error('[cPanel MySQL] Error al eliminar producto:', err);
    return false;
  }
}

/**
 * 4. ELIMINACIÓN EN LOTE (BATCH DELETE) EN CPANEL MYSQL
 */
export async function deleteMultipleCpanelProducts(ids: string[], softDelete: boolean = false): Promise<number> {
  if (!ids || ids.length === 0) return 0;

  try {
    const res = await fetch(API_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids,
        action: softDelete ? 'update_status' : 'delete',
        active: false
      })
    });

    if (!res.ok) {
      // Fallback
      const adminRes = await fetch('/api/admin/products/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, softDelete })
      });
      if (adminRes.ok) {
        const data = await adminRes.json();
        return data.count || ids.length;
      }
      return 0;
    }

    const data = await res.json();
    return data.deletedCount || data.affectedCount || ids.length;
  } catch (err) {
    console.error('[cPanel MySQL] Error en eliminación en lote:', err);
    return 0;
  }
}

/**
 * 5. ACTUALIZAR ESTADO EN LOTE (ACTIVAR / PAUSAR) EN CPANEL MYSQL
 */
export async function updateMultipleCpanelProducts(ids: string[], updates: Partial<Product>): Promise<boolean> {
  if (!ids || ids.length === 0) return false;

  try {
    const res = await fetch(API_BATCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids,
        action: 'update_status',
        active: updates.active !== false
      })
    });
    return res.ok;
  } catch (err) {
    console.error('[cPanel MySQL] Error al actualizar estado en lote:', err);
    return false;
  }
}

/**
 * 6. DUPLICAR PRODUCTO EN CPANEL MYSQL
 */
export async function duplicateCpanelProduct(product: Product): Promise<Product> {
  const newId = `prod-${Date.now()}`;
  const duplicated: Partial<Product> = {
    ...product,
    id: newId,
    title: `${product.title} (Copia)`,
    slug: `${product.slug}-copia-${Date.now().toString().slice(-4)}`,
    stock: product.stock > 0 ? product.stock : 10,
    active: false, // Inicia pausado por seguridad
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return saveCpanelProduct(duplicated);
}

/**
 * 7. DECREMENTAR STOCK TRAS UNA COMPRA (CHECKOUT)
 */
export async function decrementCpanelProductStock(productId: string, quantity: number = 1): Promise<void> {
  if (!productId || quantity <= 0) return;

  try {
    // Consultar producto actual
    const res = await fetch(`${API_PRODUCTS_URL}?id=${encodeURIComponent(productId)}`);
    if (res.ok) {
      const data = await res.json();
      const current = data.data;
      if (current) {
        const newStock = Math.max(0, (Number(current.stock) || 0) - quantity);
        await fetch(`${API_PRODUCTS_URL}?id=${encodeURIComponent(productId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, stock: newStock })
        });
      }
    }
  } catch (e) {
    console.warn('[cPanel Stock] No se pudo decrementar stock:', e);
  }
}

/**
 * 8. SUBIR O PROCESAR IMAGEN DE PRODUCTO PARA CPANEL MYSQL
 */
export async function uploadProductImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * 9. VERIFICAR CONEXIÓN CON CPANEL MYSQL
 */
export async function checkCpanelConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const res = await fetch(`${API_PRODUCTS_URL}?only_active=1`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      return { connected: true, message: 'cPanel MySQL Conectado y Operativo' };
    }
    return { connected: false, message: `Respuesta HTTP ${res.status}` };
  } catch (err: any) {
    return { connected: false, message: `Sin conexión: ${err.message}` };
  }
}
