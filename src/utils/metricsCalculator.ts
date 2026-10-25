import { Order, Product, AdminStats, ProductProfitItem } from '../types/index.ts';

/**
 * Convierte cualquier valor a número float de forma segura para evitar NaN
 */
export function safeFloat(val: any, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).trim();
  if (str === '') return fallback;
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Convierte createdAt a zona horaria de Colombia (America/Bogota, UTC-5)
 * y lo compara con el inicio del día (setHours(0, 0, 0, 0)) para solucionar el fallo de ventas del día.
 */
export function isOrderTodayColombia(createdAtStr?: string): boolean {
  if (!createdAtStr) return false;
  try {
    const orderDate = new Date(createdAtStr);
    if (isNaN(orderDate.getTime())) return false;

    // 1. Fecha calendario en Colombia (UTC-5)
    const orderDateColStr = orderDate.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    const todayColStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    if (orderDateColStr === todayColStr) return true;

    // 2. Comparación con new Date().setHours(0,0,0,0) usando hora ajustada a Colombia
    const orderColDate = new Date(orderDate.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return orderColDate.getTime() >= startOfToday.getTime();
  } catch {
    return false;
  }
}

/**
 * Determina si el pedido corresponde al mes actual en zona horaria de Colombia (UTC-5)
 */
export function isOrderMonthColombia(createdAtStr?: string): boolean {
  if (!createdAtStr) return false;
  try {
    const orderDate = new Date(createdAtStr);
    if (isNaN(orderDate.getTime())) return false;

    const orderColDate = new Date(orderDate.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
    const nowColDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));

    return (
      orderColDate.getFullYear() === nowColDate.getFullYear() &&
      orderColDate.getMonth() === nowColDate.getMonth()
    );
  } catch {
    return false;
  }
}

export interface OrderFinancials {
  totalRecaudado: number;
  costoMercancia: number;
  costoEnvio: number;
  dropiFees: number;
  gananciaNeta: number;
}

/**
 * Calcula los componentes financieros exactos de un pedido según las reglas solicitadas:
 * 1. Costos: Itera en order.items sumando (item.costPrice || item.costo || 0) * (item.quantity || 1)
 * 2. Logística y Dropi: Suma pedido.costo_envio o itera en items (item.shippingCost || item.flete || 0) + Dropi fee (item.dropiFee || 0)
 * 3. Ganancia Neta: Total Recaudado - Costo de Mercancía - Costo de Envío - Dropi Fees
 */
export function calculateOrderFinancials(order: Order, productsMap?: Map<string, Product>): OrderFinancials {
  const items = Array.isArray(order.items) ? order.items : [];

  // 1. Costo de Ventas (Mercancía)
  let costoMercancia = 0;
  for (const item of items) {
    let unitCost = safeFloat(item.costPrice || (item as any).costo || (item as any).unitCost || (item as any).cost);
    if (unitCost === 0 && productsMap && item.productId) {
      const prod = productsMap.get(item.productId);
      if (prod) {
        unitCost = safeFloat(prod.costPrice || (prod as any).costo || (prod as any).supplier_cost);
      }
    }
    const quantity = safeFloat(item.quantity, 1);
    costoMercancia += unitCost * quantity;
  }

  // Fallback si no tiene items detallados pero trae costo total de mercancía
  if (costoMercancia === 0 && (order.productCostTotal || (order as any).costo_total)) {
    costoMercancia = safeFloat(order.productCostTotal || (order as any).costo_total);
  }

  // 2. Costo de Envío / Logística: Suma pedido.costo_envio o itera en items (item.shippingCost || item.flete || 0)
  let costoEnvio = safeFloat(
    (order as any).costo_envio ||
    order.shippingCost ||
    (order as any).shipping_cost ||
    (order as any).flete ||
    (order as any).flete_envio ||
    order.carrierFee
  );

  if (costoEnvio === 0 && items.length > 0) {
    for (const item of items) {
      const itemShipping = safeFloat((item as any).shippingCost || (item as any).flete || (item as any).flete_envio);
      costoEnvio += itemShipping;
    }
  }

  // 3. Dropi Fees: Suma pedido.dropiFee o itera en items (item.dropiFee || 0)
  let dropiFees = safeFloat((order as any).dropiFee || (order as any).dropi_fee || order.dropiFee);
  if (dropiFees === 0 && items.length > 0) {
    for (const item of items) {
      const itemFee = safeFloat((item as any).dropiFee || (item as any).dropi_fee || (item as any).comisionDropi);
      dropiFees += itemFee;
    }
  }

  // 4. Total Recaudado
  const totalRecaudado = safeFloat(order.total || (order as any).totalAmount || order.subtotal);

  // 5. Ganancia Neta: Total Recaudado - Costo de Mercancía - Costo de Envío - Dropi Fees
  const gananciaNeta = totalRecaudado - costoMercancia - costoEnvio - dropiFees;

  return {
    totalRecaudado,
    costoMercancia,
    costoEnvio,
    dropiFees,
    gananciaNeta
  };
}

/**
 * Calcula el objeto completo AdminStats a partir de la lista de pedidos y catálogo de productos
 */
export function calculateDashboardMetrics(orders: Order[], products: Product[]): AdminStats {
  const productsMap = new Map<string, Product>();
  for (const p of products) {
    productsMap.set(p.id, p);
    if (p.slug) productsMap.set(p.slug, p);
  }

  let totalRevenue = 0;
  let totalProductCosts = 0;
  let totalCarrierCosts = 0;
  let totalDropiFees = 0;
  let totalNetProfit = 0;

  let todaySales = 0;
  let todayOrders = 0;
  let todayProductCosts = 0;
  let todayCarrierCosts = 0;
  let todayDropiFees = 0;
  let todayGrossProfit = 0;

  let monthSales = 0;
  let monthOrders = 0;
  let monthProductCosts = 0;
  let monthCarrierCosts = 0;
  let monthDropiFees = 0;
  let monthGrossProfit = 0;

  let pendingOrders = 0;
  let processingOrders = 0;
  let shippedOrders = 0;
  let deliveredOrders = 0;

  // Seguimiento de ventas por producto para desglose de ganancias
  const productSalesMap = new Map<string, { units: number; revenue: number; cost: number }>();

  for (const order of orders) {
    const fin = calculateOrderFinancials(order, productsMap);
    const dateStr = order.createdAt || (order as any).created_at || (order as any).fecha;

    const isToday = isOrderTodayColombia(dateStr);
    const isMonth = isOrderMonthColombia(dateStr);

    totalRevenue += fin.totalRecaudado;
    totalProductCosts += fin.costoMercancia;
    totalCarrierCosts += fin.costoEnvio;
    totalDropiFees += fin.dropiFees;
    totalNetProfit += fin.gananciaNeta;

    if (isToday) {
      todaySales += fin.totalRecaudado;
      todayOrders += 1;
      todayProductCosts += fin.costoMercancia;
      todayCarrierCosts += fin.costoEnvio;
      todayDropiFees += fin.dropiFees;
      todayGrossProfit += fin.gananciaNeta;
    }

    if (isMonth) {
      monthSales += fin.totalRecaudado;
      monthOrders += 1;
      monthProductCosts += fin.costoMercancia;
      monthCarrierCosts += fin.costoEnvio;
      monthDropiFees += fin.dropiFees;
      monthGrossProfit += fin.gananciaNeta;
    }

    // Estados
    const st = String(order.status || (order as any).estado || '').toLowerCase().trim();
    if (st === 'pendiente' || st === 'pendiente_revision' || st === 'pending_cod_confirmation') {
      pendingOrders += 1;
    } else if (st === 'procesando' || st === 'pago_confirmado' || st === 'confirmed') {
      processingOrders += 1;
    } else if (st === 'enviado' || st === 'shipped' || st === 'aprobado_dropi') {
      shippedOrders += 1;
    } else if (st === 'entregado' || st === 'delivered') {
      deliveredOrders += 1;
    }

    // Acumulado por producto
    const items = Array.isArray(order.items) ? order.items : [];
    for (const it of items) {
      const pId = it.productId || (it as any).id;
      if (!pId) continue;
      const prev = productSalesMap.get(pId) || { units: 0, revenue: 0, cost: 0 };
      const qty = safeFloat(it.quantity, 1);
      const subtotal = safeFloat(it.subtotal || it.unitPrice * qty);
      const cost = safeFloat(it.unitCost || it.costPrice || (it as any).costo || 0) * qty;

      productSalesMap.set(pId, {
        units: prev.units + qty,
        revenue: prev.revenue + subtotal,
        cost: prev.cost + cost
      });
    }
  }

  // Desglose de ganancia por producto
  const productProfitBreakdown: ProductProfitItem[] = products.map(p => {
    const cost = safeFloat(p.costPrice) > 0 ? safeFloat(p.costPrice) : Math.round(safeFloat(p.price) * 0.45);
    const unitMargin = safeFloat(p.price) - cost;
    const marginPct = cost > 0 ? (unitMargin / cost) * 100 : 0;
    const sales = productSalesMap.get(p.id) || { units: 0, revenue: 0, cost: 0 };
    const itemProfit = sales.revenue - sales.cost;

    return {
      productId: p.id,
      productTitle: p.title,
      productImage: p.images?.[0] || '',
      categoryName: p.categoryName || 'Catálogo',
      price: safeFloat(p.price),
      costPrice: cost,
      unitMargin,
      marginPercentage: Math.round(marginPct * 10) / 10,
      unitsSold: sales.units,
      totalRevenue: sales.revenue,
      totalCost: sales.cost,
      totalProfit: itemProfit,
      profitMarginPercentage: sales.revenue > 0 ? Math.round((itemProfit / sales.revenue) * 100) : Math.round(marginPct)
    };
  });

  const totalOrders = orders.length;
  const totalGrossProfit = totalRevenue - totalProductCosts;
  const averageMarginPercentage = totalRevenue > 0
    ? Math.round((totalNetProfit / totalRevenue) * 100 * 10) / 10
    : 0;
  const netMarginPercentage = totalRevenue > 0
    ? Math.round((totalNetProfit / totalRevenue) * 100 * 10) / 10
    : 0;

  const totalOperatingCost = totalProductCosts + totalCarrierCosts + totalDropiFees;
  const todayOperatingCost = todayProductCosts + todayCarrierCosts + todayDropiFees;
  const monthOperatingCost = monthProductCosts + monthCarrierCosts + monthDropiFees;

  return {
    totalRevenue,
    totalSales: totalRevenue,
    totalOrders,
    totalGrossProfit,
    totalProductCosts,
    totalCarrierCosts,
    totalDropiFees,
    totalOperatingCost,
    totalNetProfit,
    averageMarginPercentage,
    netMarginPercentage,

    todaySales,
    todayOrders,
    todayGrossProfit,
    todayProductCosts,
    todayOperatingCost,
    todayCarrierCosts,
    todayDropiFees,
    todayNetProfit: todayGrossProfit,

    monthSales,
    monthOrders,
    monthGrossProfit,
    monthProductCosts,
    monthOperatingCost,
    monthCarrierCosts,
    monthDropiFees,
    monthNetProfit: monthGrossProfit,

    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    totalProducts: products.length,
    totalCustomers: 0,
    productProfitBreakdown
  };
}
