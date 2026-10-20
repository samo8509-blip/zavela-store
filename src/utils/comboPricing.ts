import { Product, CartItem } from '../types/index.ts';

/**
 * Extrae el costo de flete interno incluido en el precio del producto.
 * Evalúa las propiedades guardadas en base de datos: shippingCost, fleteEnvio, flete, etc.
 * Aplica la regla: flete = product.shippingCost || product.fleteEnvio || product.flete || 0
 */
export function getProductInternalShipping(product: Product | null | undefined): number {
  if (!product) return 0;
  const p = product as any;
  const flete = Number(
    product.shippingCost ||
    product.shipping_cost ||
    p.fleteEnvio ||
    p.flete_envio ||
    p.flete ||
    p.estimatedShippingCost ||
    0
  );
  return flete > 0 ? flete : 0;
}

export interface QuantityPricingResult {
  regularTotal: number;              // Precio normal sin descuento (unitPrice * quantity)
  discountedTotal: number;           // Total a pagar con la regla de Envío Único: (Precio Base * cantidad) + flete
  savings: number;                   // Ahorro total: regularTotal - discountedTotal = flete * (quantity - 1)
  unitEffectivePrice: number;        // Precio unitario efectivo redondeado
  flete: number;                     // Flete unitario extraído del producto
  basePriceWithoutShipping: number;  // Precio base del producto sin flete (unitPrice - flete)
  hasShippingDiscount: boolean;      // Verdadero si aplica descuento por 2 o más unidades con flete válido
}

/**
 * Aplica la regla matemática de "Envío Único" por cantidad para un producto:
 * 1. Extraer el flete: flete = product.shippingCost || product.fleteEnvio || product.flete || 0
 * 2. Precio Base del ítem = product.precio - flete
 * 3. Total = (Precio Base * cantidad) + flete
 *
 * Ejemplo exacto:
 * - Precio público de 1 unidad = 56.000
 * - Flete interno = 25.000
 * - Precio Base sin flete = 31.000
 * - Si el cliente compra 2 unidades: (31.000 * 2) + 25.000 = 87.000 (Ahorra 25.000)
 * - Si el cliente compra 3 unidades: (31.000 * 3) + 25.000 = 118.000 (Ahorra 50.000)
 */
export function calculateQuantityPricing(
  product: Product,
  quantity: number,
  overrideUnitPrice?: number
): QuantityPricingResult {
  const q = Math.max(1, quantity);
  const rawUnitPrice = Number(
    overrideUnitPrice && overrideUnitPrice > 0 
      ? overrideUnitPrice 
      : ((product as any).originalPrice || product.price || (product as any).precio || 0)
  );

  const flete = getProductInternalShipping(product);
  const regularTotal = rawUnitPrice * q;

  // Si quantity es 1 o no hay flete configurado / flete no válido (>= precio del producto)
  if (q <= 1 || flete <= 0 || flete >= rawUnitPrice) {
    return {
      regularTotal,
      discountedTotal: regularTotal,
      savings: 0,
      unitEffectivePrice: rawUnitPrice,
      flete: 0,
      basePriceWithoutShipping: rawUnitPrice,
      hasShippingDiscount: false
    };
  }

  // REGLA MATEMÁTICA DE ENVÍO ÚNICO
  const basePriceWithoutShipping = Math.max(0, rawUnitPrice - flete);
  const discountedTotal = (basePriceWithoutShipping * q) + flete;
  const savings = Math.max(0, regularTotal - discountedTotal); // Equivalente a: flete * (q - 1)
  const unitEffectivePrice = Math.round(discountedTotal / q);

  return {
    regularTotal,
    discountedTotal,
    savings,
    unitEffectivePrice,
    flete,
    basePriceWithoutShipping,
    hasShippingDiscount: true
  };
}

export interface CartTotalsResult {
  regularSubtotal: number;
  shippingSavings: number;
  discountedSubtotal: number;
  totalItemCount: number;
}

/**
 * Calcula los totales del carrito aplicando la regla de "Envío Único"
 * cuando el cliente tiene 2 o más unidades del MISMO producto en el carrito.
 */
export function calculateCartTotals(cartItems: CartItem[]): CartTotalsResult {
  if (!cartItems || cartItems.length === 0) {
    return {
      regularSubtotal: 0,
      shippingSavings: 0,
      discountedSubtotal: 0,
      totalItemCount: 0
    };
  }

  // Agrupar ítems por ID de producto para aplicar la regla de Envío Único
  const productGroups = new Map<string, {
    product: Product;
    totalQuantity: number;
    itemsTotal: number;
    originalCatalogTotal: number;
    flete: number;
    hasPrecalculatedComboDiscount: boolean;
  }>();

  for (const item of cartItems) {
    const pId = String(item.product.id || item.product.slug || 'unknown');
    const qty = Math.max(1, Number(item.quantity || 1));
    const currentPrice = Number(item.variant?.price || item.product.price || 0);
    const catalogPrice = Number(
      (item.product as any).originalPrice ||
      (item.product as any).precioCatalogo ||
      currentPrice
    );
    const flete = getProductInternalShipping(item.product);

    if (!productGroups.has(pId)) {
      productGroups.set(pId, {
        product: item.product,
        totalQuantity: qty,
        itemsTotal: currentPrice * qty,
        originalCatalogTotal: catalogPrice * qty,
        flete,
        hasPrecalculatedComboDiscount: Boolean(
          item.comboInfo || 
          ((item.product as any).originalPrice && (item.product as any).originalPrice > currentPrice)
        )
      });
    } else {
      const g = productGroups.get(pId)!;
      g.totalQuantity += qty;
      g.itemsTotal += currentPrice * qty;
      g.originalCatalogTotal += catalogPrice * qty;
      if (item.comboInfo || ((item.product as any).originalPrice && (item.product as any).originalPrice > currentPrice)) {
        g.hasPrecalculatedComboDiscount = true;
      }
    }
  }

  let regularSubtotal = 0;
  let totalSavings = 0;

  productGroups.forEach((group) => {
    // Si los ítems ya traían el precio unitario efectivo con descuento de combo aplicado
    if (group.hasPrecalculatedComboDiscount) {
      regularSubtotal += group.originalCatalogTotal;
      const groupSavings = Math.max(0, group.originalCatalogTotal - group.itemsTotal);
      totalSavings += groupSavings;
    } else {
      regularSubtotal += group.itemsTotal;
      // Si hay 2 o más unidades del MISMO producto y tiene flete > 0
      if (group.totalQuantity >= 2 && group.flete > 0) {
        // Regla Envío Único: Se cobra el flete UNA sola vez. Ahorro = (cantidad - 1) * flete
        const maxSavings = Math.max(0, group.itemsTotal - group.flete);
        const groupSavings = Math.min((group.totalQuantity - 1) * group.flete, maxSavings);
        totalSavings += groupSavings;
      }
    }
  });

  const discountedSubtotal = Math.max(0, regularSubtotal - totalSavings);
  const totalItemCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  return {
    regularSubtotal,
    shippingSavings: totalSavings,
    discountedSubtotal,
    totalItemCount
  };
}
