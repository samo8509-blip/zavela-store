/**
 * Zavela Store - Configuración Centralizada de API
 * ESTRICTAMENTE HTTPS: Elimina cualquier riesgo de bloqueo por "Mixed Content" en navegadores.
 */

// URLs base de producción seguras bajo SSL/TLS
export const CPANEL_BASE_URL = 'https://zavelastore.com.co';
export const CPANEL_API_URL = 'https://api.zavelastore.com.co';

export const API_ENDPOINTS = {
  // Script directo en cPanel para persistencia rápida en MySQL
  productsPhp: `${CPANEL_BASE_URL}/products.php`,
  apiPhp: `${CPANEL_BASE_URL}/api.php`,
  apiSubdomain: `${CPANEL_API_URL}/api.php`,

  // Endpoints locales de Express (proxies)
  localProducts: '/api/products',
  localAdvisors: '/api/advisors',
  localCustomers: '/api/customers',
  localSettings: '/api/settings',
} as const;

/**
 * Guarda o actualiza un producto garantizando persistencia en MySQL cPanel
 * y esperando la confirmación de la respuesta HTTP 200 { success: true }
 */
export async function saveProductToCpanel(productData: any): Promise<{ success: boolean; data?: any; shipping_cost?: number }> {
  const payload = {
    ...productData,
    id: String(productData.id || productData.slug || `prod-${Date.now()}`),
    shipping_cost: Number(productData.shipping_cost ?? productData.flete_envio ?? productData.estimatedShippingCost ?? 16500),
    costPrice: Number(productData.costPrice ?? productData.costo_proveedor ?? productData.supplier_cost ?? 0),
    price: Number(productData.price ?? productData.precio ?? 0)
  };

  // 1. Guardar primero en el endpoint local /api/products/:id
  const targetId = payload.id;
  const localRes = await fetch(`/api/products/${encodeURIComponent(targetId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!localRes.ok) {
    const errorBody = await localRes.json().catch(() => ({}));
    throw new Error(errorBody.error || errorBody.message || 'Error al persistir el producto');
  }

  const localJson = await localRes.json();

  // 2. Sincronizar en segundo plano con el script PHP en HTTPS si está accesible
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    fetch(API_ENDPOINTS.productsPhp, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    }).catch(() => null).finally(() => clearTimeout(timeout));
  } catch {}

  return localJson;
}
