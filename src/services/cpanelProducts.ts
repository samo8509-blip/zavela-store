// ==============================================================================
// ZavelaStore - Servicio Cliente de Productos en MySQL (cPanel)
// Reemplazo completo de Cloud Firestore para el Catálogo de Productos
// ==============================================================================

import { Product } from '../types/index.ts';

const API_PRODUCTS_URL = '/api/products.php';
const API_BATCH_URL = '/api/products_batch.php';
const API_ADMIN_PRODUCTS_URL = '/api/admin/products';

const OVERRIDE_STORAGE_PREFIX = 'zavela_product_override_';
const OVERRIDES_MAP_KEY = 'zavela_product_overrides_map';

export interface ProductCostOverride {
  shippingCost: number;
  dropiFee: number;
  dropiProductId: string;
  provider?: string;
  updatedAt: number;
}

export function saveLocalProductOverride(productId: string, data: { shippingCost?: number; dropiFee?: number; dropiProductId?: string; provider?: string }): void {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const cleanId = String(productId).trim();
    const existing = getLocalProductOverride(cleanId) || { shippingCost: 0, dropiFee: 0, dropiProductId: '', updatedAt: 0 };
    const updated: ProductCostOverride = {
      shippingCost: data.shippingCost !== undefined ? Number(data.shippingCost) : existing.shippingCost,
      dropiFee: data.dropiFee !== undefined ? Number(data.dropiFee) : existing.dropiFee,
      dropiProductId: data.dropiProductId !== undefined ? String(data.dropiProductId).trim() : existing.dropiProductId,
      provider: data.provider || existing.provider,
      updatedAt: Date.now()
    };
    localStorage.setItem(`${OVERRIDE_STORAGE_PREFIX}${cleanId}`, JSON.stringify(updated));

    const rawMap = localStorage.getItem(OVERRIDES_MAP_KEY);
    const map: Record<string, ProductCostOverride> = rawMap ? JSON.parse(rawMap) : {};
    map[cleanId] = updated;
    localStorage.setItem(OVERRIDES_MAP_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[cPanelProducts] Error saving local override:', e);
  }
}

export function getLocalProductOverride(productId: string): ProductCostOverride | null {
  if (typeof window === 'undefined' || !productId) return null;
  try {
    const cleanId = String(productId).trim();
    const stored = localStorage.getItem(`${OVERRIDE_STORAGE_PREFIX}${cleanId}`);
    if (stored) {
      return JSON.parse(stored);
    }
    const rawMap = localStorage.getItem(OVERRIDES_MAP_KEY);
    if (rawMap) {
      const map = JSON.parse(rawMap);
      if (map[cleanId]) return map[cleanId];
    }
  } catch {}
  return null;
}

export function normalizeCpanelProduct(p: any): Product {
  const pId = String(p.id || p.productId || '').trim();
  const override = pId ? getLocalProductOverride(pId) : null;

  const dropiId = override && override.dropiProductId !== undefined
    ? override.dropiProductId
    : String(p.dropiProductId || p.dropi_product_id || p.dropi_id || '').trim();

  const provider = override?.provider || p.provider || (dropiId ? 'dropi' : 'derocha');
  const isDropiProduct = provider === 'dropi' || Boolean(dropiId) || String(p.supplier || '').toLowerCase().includes('dropi');

  // PRIORIDAD ABSOLUTA: Si el usuario guardó valores en el editor, el respaldo local en localStorage
  // prevalece sobre cualquier respuesta de products.php o valores desactualizados de la BD externa.
  let shipping = 0;
  if (override && typeof override.shippingCost === 'number') {
    shipping = override.shippingCost;
  } else {
    const rawShipping = p.shippingCost ?? p.shipping_cost ?? p.flete_envio ?? p.flete ?? p.estimatedShippingCost;
    if (rawShipping !== undefined && rawShipping !== null && rawShipping !== '') {
      const num = Number(rawShipping);
      if (num === 16500 && isDropiProduct) {
        // Eliminar fallback residual forzado del servidor cPanel externo para Dropi
        shipping = 0;
      } else {
        shipping = isNaN(num) ? 0 : num;
      }
    }
  }

  let fee = 0;
  if (override && typeof override.dropiFee === 'number') {
    fee = override.dropiFee;
  } else {
    const rawFee = p.dropiFee ?? p.dropi_fee;
    if (rawFee !== undefined && rawFee !== null && rawFee !== '') {
      const num = Number(rawFee);
      fee = isNaN(num) ? 0 : num;
    }
  }

  const supplier = p.supplier || (provider === 'dropi' ? 'Dropi Colombia' : (provider === 'derocha' ? 'DeRocha' : 'Bodega Directa'));

  return {
    ...p,
    id: pId || String(p.id),
    title: p.title || p.nombre || p.name || '',
    nombre: p.nombre || p.title || p.name || '',
    shippingCost: shipping,
    shipping_cost: shipping,
    flete_envio: shipping,
    flete: shipping,
    estimatedShippingCost: shipping,
    dropiFee: fee,
    dropi_fee: fee,
    dropiProductId: dropiId,
    dropi_product_id: dropiId,
    provider,
    supplier
  } as Product;
}

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
        const rawList = Array.isArray(adminData.data) ? adminData.data : [];
        const mappedList = rawList.map(normalizeCpanelProduct);
        return onlyActive ? mappedList.filter((p: Product) => p.active !== false) : mappedList;
      }
      throw new Error(`HTTP ${res.status} al consultar productos de cPanel MySQL`);
    }

    const data = await res.json();
    const rawList: any[] = Array.isArray(data.data) 
      ? data.data 
      : (Array.isArray(data) ? data : []);

    const mappedList = rawList.map(normalizeCpanelProduct);
    return onlyActive ? mappedList.filter(p => p.active !== false) : mappedList;
  } catch (error: any) {
    console.warn('[cPanel MySQL] Error al obtener productos:', error.message);
    // Fallback hacia /api/admin/products
    try {
      const fallbackRes = await fetch(API_ADMIN_PRODUCTS_URL);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const rawList = Array.isArray(fallbackData.data) ? fallbackData.data : [];
        const mappedList = rawList.map(normalizeCpanelProduct);
        return onlyActive ? mappedList.filter((p: Product) => p.active !== false) : mappedList;
      }
    } catch {}
    return [];
  }
}

/**
 * 2. GUARDAR / CREAR O ACTUALIZAR PRODUCTO EN CPANEL MYSQL
 */
export async function saveCpanelProduct(productData: Partial<Product>): Promise<Product> {
  const targetId = productData.id || (productData as any).productId;
  const isEdit = Boolean(targetId);
  const url = isEdit ? `${API_ADMIN_PRODUCTS_URL}/${encodeURIComponent(targetId!)}` : API_ADMIN_PRODUCTS_URL;
  const method = isEdit ? 'PUT' : 'POST';

  const catValue = (productData as any).categoria || (productData as any).category || productData.categoryName || '';
  const catIdValue = productData.categoryId || (productData as any).category_id || (productData as any).categoria_id || '';

  // Asegurar extracción del número digitado en el input sin valores forzados (0 por defecto)
  const shippingValue = Number(
    (productData as any).shippingCost ??
    (productData as any).shipping_cost ??
    (productData as any).flete_envio ??
    (productData as any).flete ??
    productData.estimatedShippingCost ?? 0
  );
  const dropiFeeValue = Number((productData as any).dropiFee ?? (productData as any).dropi_fee ?? 0);
  const dropiCode = String(productData.dropiProductId || (productData as any).dropi_product_id || '').trim();
  const provider = productData.provider || (dropiCode ? 'dropi' : 'derocha');

  // Guardar inmediatamente en localStorage como respaldo local blindado
  if (targetId) {
    saveLocalProductOverride(String(targetId), {
      shippingCost: shippingValue,
      dropiFee: dropiFeeValue,
      dropiProductId: dropiCode,
      provider
    });
  }

  const payloadFinal = {
    ...productData,
    ...(targetId ? { id: targetId } : {}),
    provider,
    shippingCost: shippingValue,
    shipping_cost: shippingValue,
    flete_envio: shippingValue,
    flete: shippingValue, // Mantiene compatibilidad
    estimatedShippingCost: shippingValue,
    dropiFee: dropiFeeValue,
    dropi_fee: dropiFeeValue,
    dropiProductId: dropiCode,
    dropi_product_id: dropiCode,
    categoria: catValue,
    category: catValue,
    categoryName: catValue,
    categoryId: catIdValue,
    category_id: catIdValue,
    categoria_id: catIdValue
  };

  console.log('Payload al guardar:', payloadFinal);

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFinal)
    });

    if (!res.ok) {
      // Fallback a API directa de productos
      const phpUrl = isEdit ? `${API_PRODUCTS_URL}?id=${encodeURIComponent(targetId!)}` : API_PRODUCTS_URL;
      const phpRes = await fetch(phpUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFinal)
      });
      if (phpRes.ok) {
        const phpData = await phpRes.json();
        const finalId = phpData.data?.id || targetId;
        if (finalId) {
          saveLocalProductOverride(String(finalId), {
            shippingCost: shippingValue,
            dropiFee: dropiFeeValue,
            dropiProductId: dropiCode,
            provider
          });
        }
        return normalizeCpanelProduct(phpData.data || payloadFinal);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `HTTP ${res.status} al guardar producto`);
    }

    const data = await res.json();
    const finalData = data.data || payloadFinal;
    const finalId = finalData?.id || targetId;
    if (finalId) {
      saveLocalProductOverride(String(finalId), {
        shippingCost: shippingValue,
        dropiFee: dropiFeeValue,
        dropiProductId: dropiCode,
        provider
      });
    }
    return normalizeCpanelProduct(finalData);
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
    const res = await fetch(`${API_ADMIN_PRODUCTS_URL}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: false })
    });
    return res.ok;
  }

  try {
    const res = await fetch(`${API_ADMIN_PRODUCTS_URL}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const phpRes = await fetch(`${API_PRODUCTS_URL}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return phpRes.ok;
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
