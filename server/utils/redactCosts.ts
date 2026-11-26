/**
 * Oculta a los visitantes los datos de costo de un producto (costo del proveedor, tarifa Dropi, ganancias).
 * Administradores y asesores (con sesión) siguen viéndolos. El flete se deja porque la tienda lo usa para el envío.
 * El servidor calcula el costo de cada pedido desde la base de datos, no desde lo que envía el navegador.
 */
const MONEY_KEYS = [
  'costPrice', 'supplier_cost', 'costo', 'dropiFee', 'dropi_fee', 'tarifa_dropi',
  'totalOperatingCost', 'realNetProfit', 'realNetMarginPercentage', 'marginAmount', 'marginPercentage'
];
const TEXT_KEYS = ['supplierSku', 'supplier_sku'];

export function canSeeCosts(res: { locals?: any }): boolean {
  return Boolean(res?.locals?.isAdmin || res?.locals?.isAdvisor || res?.locals?.accountingLevel);
}

export function redactProductCosts<T extends Record<string, any>>(p: T): T {
  if (!p || typeof p !== 'object') return p;
  const out: any = { ...p };
  for (const k of MONEY_KEYS) if (k in out) out[k] = 0;
  for (const k of TEXT_KEYS) if (k in out) out[k] = '';
  return out;
}
