import { Product } from '../types/index.ts';

declare global {
  interface Window {
    ttq?: {
      page: () => void;
      track: (event: string, params?: Record<string, any>) => void;
      identify: (params: Record<string, any>) => void;
    };
  }
}

export const TIKTOK_PIXEL_ID = 'DBTI9D3C77UEEP3E5PVG';

export function trackTikTokPage(): void {
  try {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.page();
    }
  } catch {
    // Ignore tracking errors
  }
}

export function trackTikTokViewContent(product: Product, unitPrice?: number): void {
  try {
    if (typeof window !== 'undefined' && window.ttq) {
      const price = unitPrice && unitPrice > 0 ? unitPrice : product.price || 0;
      window.ttq.track('ViewContent', {
        contents: [
          {
            content_id: String(product.id),
            content_type: 'product',
            content_name: product.title || product.name || 'Producto Zavela',
            content_category: product.categoryName || 'General',
            price: Number(price) || 0,
            quantity: 1
          }
        ],
        value: Number(price) || 0,
        currency: 'COP'
      });
    }
  } catch {
    // Ignore tracking errors
  }
}

export function trackTikTokAddToCart(product: Product, quantity: number = 1, unitPrice?: number): void {
  try {
    if (typeof window !== 'undefined' && window.ttq) {
      const price = unitPrice && unitPrice > 0 ? unitPrice : product.price || 0;
      window.ttq.track('AddToCart', {
        contents: [
          {
            content_id: String(product.id),
            content_type: 'product',
            content_name: product.title || product.name || 'Producto Zavela',
            content_category: product.categoryName || 'General',
            price: Number(price) || 0,
            quantity: Number(quantity) || 1
          }
        ],
        value: (Number(price) || 0) * (Number(quantity) || 1),
        currency: 'COP'
      });
    }
  } catch {
    // Ignore tracking errors
  }
}

export function trackTikTokInitiateCheckout(
  items: { product: Product; quantity: number }[],
  totalValue: number
): void {
  try {
    if (typeof window !== 'undefined' && window.ttq) {
      window.ttq.track('InitiateCheckout', {
        contents: items.map(item => ({
          content_id: String(item.product?.id || ''),
          content_type: 'product',
          content_name: item.product?.title || item.product?.name || 'Producto Zavela',
          price: Number(item.product?.price || 0),
          quantity: Number(item.quantity || 1)
        })),
        value: Number(totalValue) || 0,
        currency: 'COP'
      });
    }
  } catch {
    // Ignore tracking errors
  }
}

export function trackTikTokPurchase(
  items: { product: Product; quantity: number; unitPrice?: number }[],
  totalValue: number,
  customer?: { phone?: string; email?: string }
): void {
  try {
    if (typeof window !== 'undefined' && window.ttq) {
      if (customer?.phone || customer?.email) {
        window.ttq.identify({
          ...(customer.phone ? { phone_number: customer.phone } : {}),
          ...(customer.email ? { email: customer.email } : {})
        });
      }

      window.ttq.track('CompletePayment', {
        contents: items.map(item => ({
          content_id: String(item.product?.id || ''),
          content_type: 'product',
          content_name: item.product?.title || item.product?.name || 'Producto Zavela',
          price: Number(item.unitPrice || item.product?.price || 0),
          quantity: Number(item.quantity || 1)
        })),
        value: Number(totalValue) || 0,
        currency: 'COP'
      });
    }
  } catch {
    // Ignore tracking errors
  }
}
