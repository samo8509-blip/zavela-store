// ==============================================================================
// ZavelaStore - Servicio Cliente de Productos en MySQL (cPanel)
// ==============================================================================

import { Product } from '../types/index.ts';

const API_PRODUCTS_URL = '/api/products.php';
const API_BATCH_URL = '/api/products_batch.php';
const API_ADMIN_PRODUCTS_URL = '/api/admin/products';

// 🛡️ FUNCIÓN DE PARSEO SIMPLE Y SEGURA 🛡️
function parseSafeNumber(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  // Si es string, limpiamos solo el símbolo $ y espacios, y lo parseamos como float para respetar decimales
  let str = String(val).trim().replace(/[\$\s]/g, '');
  const num = parseFloat(str);
  
  return isNaN(num) ? 0 : num;
}

export function normalizeCpanelProduct(p: any): Product {
  if (!p) return {} as Product;

  const pId = String(p.id || p.productId || '').trim();
  const pSlug = String(p.slug || '').trim();

  let dropiId = String(p.dropiProductId || p.dropi_product_id || p.dropi_id || '').trim();
  let provider = String(p.provider || (dropiId ? 'dropi' : 'derocha')).trim();

  // LECTURA DIRECTA DE LA BASE DE DATOS USANDO PARSEO SEGURO
  const shipping = parseSafeNumber(p.shipping_cost ?? p.flete_envio ?? p.flete ?? p.shippingCost ?? p.estimatedShippingCost);
  const fee = parseSafeNumber(p.dropi_fee ?? p.dropiFee ?? p.comisionDropi ?? p.comision);

  const supplier = p.supplier || (provider === 'dropi' ? 'Dropi Colombia' : (provider === 'derocha' ? 'DeRocha' : 'Bodega Directa'));
  const costPrice = parseSafeNumber(p.costPrice ?? p.supplier_cost ?? p.costo);
  const price = parseSafeNumber(p.price ?? p.precio);
  
  const totalOperatingCost = costPrice + shipping + fee;
  const realNetProfit = price - totalOperatingCost;
  const realNetMarginPercentage = price > 0 ? Math.round((realNetProfit / price) * 100) : 0;

  return {
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
}

// Funciones vacías para evitar la caché tóxica
export function getCustomCostsMap(): Record<string, any> { return {}; }
export function saveCustomProductCost(): void { }
export function getCustomProductCost(): any | null { return null; }
export function saveLocalProductOverride(): void { }
export function getLocalProductOverride(): any | null { return null; }
export function overrideProductWithCustomCosts<T extends Partial<Product>>(p: T): T { return p; }

export async function getCpanelProducts(onlyActive: boolean = false): Promise<Product[]> {
  const url = onlyActive 
    ? `${API_PRODUCTS_URL}?only_active=1`
    : API_PRODUCTS_URL;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const adminRes = await fetch(API_ADMIN_PRODUCTS_URL);
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        const rawList = Array.isArray(adminData.data) ? adminData.data : [];
        const mappedList = rawList.map(normalizeCpanelProduct);
        return onlyActive ? mappedList.filter((p: Product) => p.active !== false) : mappedList;
      }
      throw new Error(`HTTP ${res.status} al consultar productos`);
    }

    const data = await res.json();
    const rawList: any[] = Array.isArray(data.data) 
      ? data.data 
      : (Array.isArray(data) ? data : []);

    const mappedList = rawList.map(normalizeCpanelProduct);
    return onlyActive ? mappedList.filter(p => p.active !== false) : mappedList;
  } catch (error: any) {
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

export async function saveCpanelProduct(productData: Partial<Product>): Promise<Product> {
  const targetId = productData.id || (productData as any).productId;
  const isEdit = Boolean(targetId);
  const url = isEdit ? `${API_ADMIN_PRODUCTS_URL}/${encodeURIComponent(targetId!)}` : API_ADMIN_PRODUCTS_URL;
  const method = isEdit ? 'PUT' : 'POST';

  const catValue = (productData as any).categoria || (productData as any).category || productData.categoryName || '';
  const catIdValue = productData.categoryId || (productData as any).category_id || (productData as any).categoria_id || '';

  const shippingValue = parseSafeNumber(productData.shippingCost ?? (productData as any).shipping_cost ?? (productData as any).flete_envio ?? (productData as any).flete);
  const dropiFeeValue = parseSafeNumber(productData.dropiFee ?? (productData as any).dropi_fee);
  const dropiCode = String(productData.dropiProductId || (productData as any).dropi_product_id || '').trim();
  const provider = productData.provider || (dropiCode ? 'dropi' : 'derocha');

  const payloadFinal = {
    ...productData,
    ...(targetId ? { id: targetId } : {}),
    shippingCost: shippingValue,
    shipping_cost: shippingValue,
    flete: shippingValue,
    flete_envio: shippingValue,
    dropiFee: dropiFeeValue,
    dropi_fee: dropiFeeValue,
    dropiProductId: dropiCode,
    dropi_product_id: dropiCode,
    provider: String(provider),
    estimatedShippingCost: shippingValue,
    categoria: catValue,
    category: catValue,
    categoryName: catValue,
    categoryId: catIdValue,
    category_id: catIdValue,
    categoria_id: catIdValue
  };

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFinal)
    });

    if (!res.ok) {
      const phpUrl = isEdit ? `${API_PRODUCTS_URL}?id=${encodeURIComponent(targetId!)}` : API_PRODUCTS_URL;
      const phpRes = await fetch(phpUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFinal)
      });
      if (phpRes.ok) {
        const phpData = await phpRes.json();
        return normalizeCpanelProduct(phpData.data || payloadFinal);
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return normalizeCpanelProduct(data.data || payloadFinal);
  } catch (err: any) {
    throw err;
  }
}

export const createCpanelProduct = saveCpanelProduct;
export const updateCpanelProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  return saveCpanelProduct({ ...updates, id });
};

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
    return false;
  }
}

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
    return 0;
  }
}

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
    return false;
  }
}

export async function duplicateCpanelProduct(product: Product): Promise<Product> {
  const newId = `prod-${Date.now()}`;
  const duplicated: Partial<Product> = {
    ...product,
    id: newId,
    title: `${product.title} (Copia)`,
    slug: `${product.slug}-copia-${Date.now().toString().slice(-4)}`,
    stock: product.stock > 0 ? product.stock : 10,
    active: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  return saveCpanelProduct(duplicated);
}

export async function decrementCpanelProductStock(): Promise<void> { return; }

export async function uploadProductImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function checkCpanelConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const res = await fetch(`${API_PRODUCTS_URL}?only_active=1`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) return { connected: true, message: 'cPanel MySQL Conectado y Operativo' };
    return { connected: false, message: `Respuesta HTTP ${res.status}` };
  } catch (err: any) {
    return { connected: false, message: `Sin conexión: ${err.message}` };
  }
}
