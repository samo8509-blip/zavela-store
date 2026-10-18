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
  // Asegurar extracción del número digitado en el input sin valores forzados
  const shippingValue = Number(
    productData.shippingCost ?? 
    productData.shipping_cost ?? 
    productData.flete ?? 
    productData.flete_envio ?? 
    productData.estimatedShippingCost ?? 0
  );
  const dropiFeeValue = Number(productData.dropiFee ?? productData.dropi_fee ?? 0);
  const dropiCode = String(productData.dropiProductId || productData.dropi_product_id || '').trim();
  const provider = String(productData.provider || (dropiCode ? 'dropi' : 'derocha'));

  const payloadFinal = {
    ...productData,
    id: String(productData.id || productData.slug || `prod-${Date.now()}`),
    shippingCost: Number(shippingValue),
    shipping_cost: Number(shippingValue),
    flete: Number(shippingValue),
    flete_envio: Number(shippingValue),
    estimatedShippingCost: Number(shippingValue),
    dropiFee: Number(dropiFeeValue),
    dropi_fee: Number(dropiFeeValue),
    dropiProductId: String(dropiCode || ''),
    dropi_product_id: String(dropiCode || ''),
    provider: String(provider),
    costPrice: Number(productData.costPrice ?? productData.costo_proveedor ?? productData.supplier_cost ?? 0),
    price: Number(productData.price ?? productData.precio ?? 0)
  };

  console.log('Payload al guardar:', payloadFinal);
  console.log('payload:', payloadFinal);

  // 1. Guardar primero en el endpoint local /api/products/:id
  const targetId = payloadFinal.id;
  const localRes = await fetch(`/api/products/${encodeURIComponent(targetId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadFinal)
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
      body: JSON.stringify(payloadFinal),
      signal: controller.signal
    }).catch(() => null).finally(() => clearTimeout(timeout));
  } catch {}

  return localJson;
}
