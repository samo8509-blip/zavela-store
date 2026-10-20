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
export const CUSTOM_COSTS_STORAGE_KEY = 'zavela_custom_costs_v1';

export interface ProductCostOverride {
  shippingCost: number;
  dropiFee: number;
  dropiProductId: string;
  provider?: string;
  updatedAt: number;
}

export type CustomProductCostRecord = ProductCostOverride;

export function getCustomCostsMap(): Record<string, CustomProductCostRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_COSTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomProductCost(
  productIdOrSlug: string,
  data: {
    shippingCost: number;
    dropiFee: number;
    dropiProductId?: string;
    provider?: string;
    slug?: string;
    id?: string;
  }
): void {
  if (typeof window === 'undefined') return;
  try {
    const map = getCustomCostsMap();
    const finalRecord: CustomProductCostRecord = {
      shippingCost: Number(data.shippingCost ?? 0),
      dropiFee: Number(data.dropiFee ?? 0),
      dropiProductId: String(data.dropiProductId || '').trim(),
      provider: String(data.provider || 'dropi'),
      updatedAt: Date.now()
    };

    if (productIdOrSlug) map[String(productIdOrSlug).trim()] = finalRecord;
    if (data.id) map[String(data.id).trim()] = finalRecord;
    if (data.slug) map[String(data.slug).trim()] = finalRecord;

    localStorage.setItem(CUSTOM_COSTS_STORAGE_KEY, JSON.stringify(map));

    // Compatibilidad retroactiva con prefijo individual y mapa previo
    if (data.id || productIdOrSlug) {
      const cleanKey = String(data.id || productIdOrSlug).trim();
      localStorage.setItem(`${OVERRIDE_STORAGE_PREFIX}${cleanKey}`, JSON.stringify(finalRecord));
    }
  } catch (e) {
    console.warn('[cPanelProducts] Error guardando mapa zavela_custom_costs_v1:', e);
  }
}

export function getCustomProductCost(idOrSlug?: string, secondIdOrSlug?: string): CustomProductCostRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const map = getCustomCostsMap();
    const key1 = idOrSlug ? String(idOrSlug).trim() : '';
    const key2 = secondIdOrSlug ? String(secondIdOrSlug).trim() : '';

    if (key1 && map[key1]) return map[key1];
    if (key2 && map[key2]) return map[key2];

    // Fallback retrocompatible
    if (key1) {
      const stored = localStorage.getItem(`${OVERRIDE_STORAGE_PREFIX}${key1}`);
      if (stored) return JSON.parse(stored);
    }
    if (key2) {
      const stored2 = localStorage.getItem(`${OVERRIDE_STORAGE_PREFIX}${key2}`);
      if (stored2) return JSON.parse(stored2);
    }
  } catch {}
  return null;
}

export function saveLocalProductOverride(productId: string, data: { shippingCost?: number; dropiFee?: number; dropiProductId?: string; provider?: string }): void {
  saveCustomProductCost(productId, {
    id: productId,
    shippingCost: data.shippingCost !== undefined ? Number(data.shippingCost) : 0,
    dropiFee: data.dropiFee !== undefined ? Number(data.dropiFee) : 0,
    dropiProductId: data.dropiProductId,
    provider: data.provider
  });
}

export function getLocalProductOverride(productId: string): ProductCostOverride | null {
  return getCustomProductCost(productId);
}

export function overrideProductWithCustomCosts<T extends Partial<Product>>(p: T): T {
  if (!p) return p;
  const pId = String(p.id || (p as any).productId || '').trim();
  const pSlug = String(p.slug || '').trim();
  const saved = getCustomProductCost(pId, pSlug);
  if (!saved) return p;

  const sCost = Number(saved.shippingCost ?? 0);
  const dFee = Number(saved.dropiFee ?? 0);

  p.shippingCost = sCost;
  (p as any).shipping_cost = sCost;
  (p as any).flete = sCost;
  (p as any).flete_envio = sCost;
  (p as any).estimatedShippingCost = sCost;
  p.dropiFee = dFee;
  (p as any).dropi_fee = dFee;
  if (saved.dropiProductId) {
    p.dropiProductId = saved.dropiProductId;
    (p as any).dropi_product_id = saved.dropiProductId;
  }
  if (saved.provider) {
    p.provider = saved.provider;
  }

  const cost = Number(p.costPrice || (p as any).supplier_cost || (p as any).costo || 0);
  const price = Number(p.price || (p as any).precio || 0);
  const opCost = cost + sCost + dFee;
  p.totalOperatingCost = opCost;
  p.realNetProfit = price - opCost;
  p.realNetMarginPercentage = price > 0 ? Math.round(((price - opCost) / price) * 100) : 0;

  return p;
}

export function normalizeCpanelProduct(p: any): Product {
  const pId = String(p.id || p.productId || '').trim();
  const pSlug = String(p.slug || '').trim();

  // PRIORIDAD ABSOLUTA: Consultar zavela_custom_costs_v1 en localStorage por ID o por Slug
  const saved = getCustomProductCost(pId, pSlug);

  let shipping = 0;
  let fee = 0;
  let dropiId = String(p.dropiProductId || p.dropi_product_id || p.dropi_id || '').trim();
  let provider = p.provider || (dropiId ? 'dropi' : 'derocha');

  if (saved) {
    shipping = Number(saved.shippingCost ?? 0);
    fee = Number(saved.dropiFee ?? 0);
    if (saved.dropiProductId !== undefined && saved.dropiProductId !== '') {
      dropiId = String(saved.dropiProductId).trim();
    }
    if (saved.provider) {
      provider = String(saved.provider);
    }
  } else {
    // Si no hay override en localStorage, leer lo que viene de la BD pero proteger contra 16500 de Dropi
    const rawShipping = p.shippingCost ?? p.shipping_cost ?? p.flete_envio ?? p.flete ?? p.estimatedShippingCost;
    if (rawShipping !== undefined && rawShipping !== null && rawShipping !== '') {
      const num = Number(rawShipping);
      const isDropiProduct = provider === 'dropi' || Boolean(dropiId) || String(p.supplier || '').toLowerCase().includes('dropi');
      if (num === 16500 && isDropiProduct) {
        shipping = 0;
      } else {
        shipping = isNaN(num) ? 0 : num;
      }
    }

    const rawFee = p.dropiFee ?? p.dropi_fee;
    if (rawFee !== undefined && rawFee !== null && rawFee !== '') {
      const numFee = Number(rawFee);
      fee = isNaN(numFee) ? 0 : numFee;
    }
  }

  const supplier = p.supplier || (provider === 'dropi' ? 'Dropi Colombia' : (provider === 'derocha' ? 'DeRocha' : 'Bodega Directa'));
  const costPrice = Number(p.costPrice || p.supplier_cost || p.costo || 0);
  const price = Number(p.price || p.precio || 0);
  const totalOperatingCost = costPrice + shipping + fee;
  const realNetProfit = price - totalOperatingCost;
  const realNetMarginPercentage = price > 0 ? Math.round((realNetProfit / price) * 100) : 0;

  const normalized: Product = {
    ...p,
    id: pId || String(p.id),
    title: p.title || p.nombre || p.name || '',
    nombre: p.nombre || p.title || p.name || '',
    slug: pSlug || p.slug || pId,
    costPrice,
    supplier_cost: costPrice,
    price,
    precio: price,
    shippingCost: shipping,
    shipping_cost: shipping,
    flete_envio: shipping,
    flete: shipping,
    estimatedShippingCost: shipping,
    dropiFee: fee,
    dropi_fee: fee,
    dropiProductId: dropiId,
    dropi_product_id: dropiId,
    totalOperatingCost,
    realNetProfit,
    realNetMarginPercentage,
    provider,
    supplier
  };

  if (saved) {
    normalized.shippingCost = saved.shippingCost;
    (normalized as any).shipping_cost = saved.shippingCost;
    (normalized as any).flete = saved.shippingCost;
    (normalized as any).flete_envio = saved.shippingCost;
    normalized.dropiFee = saved.dropiFee;
    (normalized as any).dropi_fee = saved.dropiFee;
    if (saved.dropiProductId) {
      normalized.dropiProductId = saved.dropiProductId;
      (normalized as any).dropi_product_id = saved.dropiProductId;
    }
    if (saved.provider) {
      normalized.provider = saved.provider;
    }
  }

  return normalized;
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

  // Guardar inmediatamente en zavela_custom_costs_v1 en localStorage como blindaje
  if (targetId || productData.slug) {
    saveCustomProductCost(String(targetId || productData.slug), {
      id: targetId ? String(targetId) : undefined,
      slug: productData.slug,
      shippingCost: shippingValue,
      dropiFee: dropiFeeValue,
      dropiProductId: dropiCode,
      provider
    });
  }

  const payloadFinal = {
    ...productData,
    ...(targetId ? { id: targetId } : {}),
    shippingCost: Number(shippingValue),
    shipping_cost: Number(shippingValue),
    flete: Number(shippingValue),
    flete_envio: Number(shippingValue),
    dropiFee: Number(dropiFeeValue),
    dropi_fee: Number(dropiFeeValue),
    dropiProductId: String(dropiCode || ''),
    dropi_product_id: String(dropiCode || ''),
    provider: String(provider),
    estimatedShippingCost: Number(shippingValue),
    categoria: catValue,
    category: catValue,
    categoryName: catValue,
    categoryId: catIdValue,
    category_id: catIdValue,
    categoria_id: catIdValue
  };

  console.log('Payload al guardar:', payloadFinal);
  console.log('payload:', payloadFinal);

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
          saveCustomProductCost(String(finalId), {
            id: String(finalId),
            slug: productData.slug,
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
      saveCustomProductCost(String(finalId), {
        id: String(finalId),
        slug: productData.slug,
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
    // LLAMADA SEGURA: Usamos la acción 'decrement_stock' de tu products.php
    // Esto garantiza que MySQL SOLO reste el stock y tenga prohibido borrar el nombre, foto o precio.
    await fetch(API_PRODUCTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'decrement_stock',
        id_producto: productId,
        cantidad: quantity
      })
    });
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