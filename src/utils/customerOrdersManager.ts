import { Order } from '../types/index.ts';

export interface CustomerPurchaseItem {
  productId: string;
  title: string;
  quantity: number;
  price: number;
  image: string;
  category?: string;
}

export interface CustomerOrderHistory {
  id: string;
  orderNumber: string;
  date: string;
  createdAt: string;
  status: 'confirmado' | 'en_preparacion' | 'enviado' | 'entregado';
  statusLabel: string;
  trackingNumber: string;
  carrier: string; // 'Servientrega' | 'Coordinadora' | 'Inter Rapidísimo' | 'Envía'
  paymentMethod: string;
  total: number;
  customerCity: string;
  customerAddress: string;
  items: CustomerPurchaseItem[];
}

const STORAGE_KEY_CUSTOMER_ORDERS = 'zavela_my_orders';

export const SEED_CUSTOMER_ORDERS: CustomerOrderHistory[] = [
  {
    id: 'ord-cust-01',
    orderNumber: 'ZAV-1002',
    date: '22 de Septiembre, 2026',
    createdAt: '2026-09-22T14:30:00Z',
    status: 'enviado',
    statusLabel: 'En Camino con Transportadora',
    trackingNumber: 'ENV-849201-CO',
    carrier: 'Envía',
    paymentMethod: 'Pago Contra Entrega en Efectivo',
    total: 145000,
    customerCity: 'Bogotá D.C.',
    customerAddress: 'Calle 127 # 19-45, Apto 502',
    items: [
      {
        productId: 'prod-sim-1',
        title: 'Disfraz Inflable de T-Rex Jurassic Park',
        quantity: 1,
        price: 145000,
        image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
        category: 'Halloween y Temporada'
      }
    ]
  },
  {
    id: 'ord-cust-02',
    orderNumber: 'ZAV-1001',
    date: '18 de Septiembre, 2026',
    createdAt: '2026-09-18T10:15:00Z',
    status: 'entregado',
    statusLabel: 'Entregado a Satisfacción',
    trackingNumber: 'SER-382910-CO',
    carrier: 'Servientrega',
    paymentMethod: 'Pago Contra Entrega en Efectivo',
    total: 135000,
    customerCity: 'Bogotá D.C.',
    customerAddress: 'Calle 127 # 19-45, Apto 502',
    items: [
      {
        productId: 'prod-sim-5',
        title: 'Perfume Sauvage Dior Elixir Concentrado',
        quantity: 1,
        price: 135000,
        image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=500',
        category: 'Perfumería Masculina'
      }
    ]
  }
];

export function getCustomerOrders(): CustomerOrderHistory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOMER_ORDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CUSTOMER_ORDERS, JSON.stringify(SEED_CUSTOMER_ORDERS));
      return SEED_CUSTOMER_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('Error reading customer orders from localStorage:', e);
  }
  return SEED_CUSTOMER_ORDERS;
}

export function saveCustomerOrders(orders: CustomerOrderHistory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOMER_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.warn('Error saving customer orders to localStorage:', e);
  }
}

/**
 * Registers an order placed in checkout into the customer's portal history
 */
export function recordCustomerPurchase(order: Order): void {
  const current = getCustomerOrders();
  const rawOrder = order as any;
  const isCOD = order.paymentMethod === 'contra_entrega' || 
                order.paymentMethod === 'cash_on_delivery' || 
                rawOrder.paymentMethod === 'contraentrega';

  const newOrder: CustomerOrderHistory = {
    id: order.id,
    orderNumber: order.orderNumber,
    date: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
    createdAt: new Date().toISOString(),
    status: 'en_preparacion',
    statusLabel: 'En Preparación en Bodega',
    trackingNumber: order.trackingNumber || `ZV-${Math.floor(100000 + Math.random() * 900000)}-CO`,
    carrier: order.carrier || 'Coordinadora',
    paymentMethod: isCOD ? 'Pago Contra Entrega en Efectivo' : 'Transferencia Bancaria',
    total: order.total || order.totalAmount || 0,
    customerCity: order.city || order.customerInfo?.city || rawOrder.shippingAddress?.city || 'Colombia',
    customerAddress: order.address || order.customerInfo?.address || rawOrder.shippingAddress?.addressLine1 || 'Dirección registrada',
    items: (order.items || []).map(item => {
      const rawItem = item as any;
      return {
        productId: item.productId,
        title: item.title || rawItem.productTitle || 'Producto Zavela',
        quantity: item.quantity,
        price: item.unitPrice || rawItem.price || 0,
        image: item.image || rawItem.productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'
      };
    })
  };

  const updated = [newOrder, ...current];
  saveCustomerOrders(updated);
}
