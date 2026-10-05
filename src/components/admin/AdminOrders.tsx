import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Truck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Eye, 
  RotateCw, 
  X, 
  Phone, 
  MapPin, 
  Loader2,
  PackageCheck,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Printer,
  DollarSign,
  User,
  ShieldCheck,
  Package,
  Sparkles,
  ShoppingBag,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Warehouse,
  Check,
  Send,
  AlertTriangle,
  FileCheck,
  Zap,
  Info,
  Sliders
} from 'lucide-react';
import { Order, OrderStatus, Product, OrderItem } from '../../types/index.ts';
import { formatCOP, formatDate, ORDER_STATUS_MAP } from '../../utils/formatters.ts';
import { getDaneCode, COLOMBIA_DEPARTMENTS } from '../../data/colombiaGeo.ts';
import { SalesSimulatorModal } from './SalesSimulatorModal.tsx';

/**
 * Parsea de forma segura los items del pedido soportando:
 * 1. String JSON directo desde base de datos MySQL (cPanel)
 * 2. Array de items previo
 * 3. Fallback seguro si viene nulo o indefinido
 */
export const parseOrderItems = (rawItems: any): OrderItem[] => {
  let list: any[] = [];
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
    } catch {
      list = [];
    }
  } else if (Array.isArray(rawItems)) {
    list = rawItems;
  } else if (rawItems && typeof rawItems === 'object') {
    list = [rawItems];
  }

  return list.map((it: any, idx: number) => {
    const title = String(it?.title || it?.productTitle || it?.nombre || it?.name || 'Producto Registrado Zavela');
    const unitPrice = Number(it?.unitPrice || it?.precio || it?.price) || 0;
    const quantity = Number(it?.quantity || it?.cantidad) || 1;
    const subtotal = Number(it?.subtotal || it?.total) || (unitPrice * quantity);
    const unitCost = Number(it?.unitCost || it?.costPrice || it?.costo) || Math.round(unitPrice * 0.5);

    return {
      id: String(it?.id || `item-${idx}`),
      productId: String(it?.productId || it?.product_id || it?.id || 'prod-custom'),
      title,
      variantId: it?.variantId || it?.variant_id,
      variantName: it?.variantName || it?.variant_name,
      quantity,
      unitPrice,
      unitCost,
      subtotal,
      image: it?.image || it?.imagen,
      dropi_product_id: it?.dropi_product_id || it?.dropiProductId
    } as OrderItem;
  });
};

/**
 * Normaliza un pedido para soportar tanto el formato devuelto por MySQL (cliente_nombre, estado, items JSON)
 * como el formato interno previo sin romper la aplicación.
 */
export const normalizeOrderSafe = (order: any): Order => {
  if (!order) {
    return {
      id: 'ord-unknown',
      orderNumber: 'ZV-0000',
      customerName: 'Cliente Zavela',
      customerPhone: '',
      department: 'Bogotá D.C.',
      city: 'Bogotá D.C.',
      address: '',
      subtotal: 0,
      shippingCost: 0,
      total: 0,
      status: 'pendiente',
      paymentMethod: 'contra_entrega',
      paymentStatus: 'CASH_ON_DELIVERY',
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Order;
  }

  const items = parseOrderItems(order.items);
  const statusRaw = String(order.status || order.estado || 'pendiente').toLowerCase().trim();
  const validStatus: OrderStatus = 
    statusRaw.includes('aprobado') ? 'APROBADO_DROPI' :
    statusRaw.includes('error') ? 'ERROR_DROPI' :
    statusRaw.includes('revis') ? 'PENDIENTE_REVISION' :
    statusRaw.includes('entrega') ? 'entregado' :
    statusRaw.includes('envia') ? 'enviado' :
    statusRaw.includes('cancel') ? 'CANCELADO' :
    statusRaw.includes('proces') ? 'procesando' :
    statusRaw.includes('pago') ? 'pago_confirmado' : 'pendiente';

  const customerName = String(order.customerName || order.cliente_nombre || order.nombre_cliente || order.cliente || 'Cliente Zavela');
  const customerPhone = String(order.customerPhone || order.cliente_telefono || order.telefono_cliente || order.telefono || '');
  const customerEmail = String(order.customerEmail || order.cliente_email || order.email_cliente || order.email || '');
  const department = String(order.department || order.cliente_departamento || order.departamento || 'Bogotá D.C.');
  const city = String(order.city || order.cliente_ciudad || order.ciudad || 'Bogotá D.C.');
  const address = String(order.address || order.cliente_direccion || order.direccion || '');
  const orderNumber = String(order.orderNumber || order.order_number || order.numero_pedido || order.id || `ZV-${order.id || ''}`);
  const total = Number(order.total || order.monto_total || order.total_amount) || 0;
  const subtotal = Number(order.subtotal) || total;
  const shippingCost = Number(order.shippingCost || order.costo_envio || order.flete) || 0;
  const paymentMethod = String(order.paymentMethod || order.metodo_pago || order.medio_pago || 'contra_entrega');
  const trackingNumber = order.trackingNumber || order.dropi_guia || order.guia || order.numero_guia || '';
  const carrier = order.carrier || order.transportadora || 'Servientrega';
  const createdAt = order.createdAt || order.created_at || order.fecha || new Date().toISOString();
  const updatedAt = order.updatedAt || order.updated_at || createdAt;

  return {
    ...order,
    id: String(order.id || orderNumber),
    orderNumber,
    customerName,
    customerPhone,
    customerEmail,
    department,
    city,
    address,
    status: validStatus,
    paymentMethod: paymentMethod as any,
    paymentStatus: (order.paymentStatus || 'CASH_ON_DELIVERY') as any,
    trackingNumber,
    carrier,
    total,
    subtotal,
    shippingCost,
    items,
    createdAt,
    updatedAt
  } as Order;
};

interface AdminOrdersProps {
  orders: Order[];
  onRefresh: () => void;
  products?: Product[];
  onEditProduct?: (product: Product) => void;
  onNavigate?: (section: any) => void;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  onRefresh,
  products = [],
  onEditProduct,
  onNavigate
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month'>('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showSimulatorModal, setShowSimulatorModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Dropi Manual Approval Modal State
  const [dropiModalOrder, setDropiModalOrder] = useState<Order | null>(null);
  const [dropiSelectedCarrier, setDropiSelectedCarrier] = useState<string>('Servientrega');
  const [dropiCustomDaneCode, setDropiCustomDaneCode] = useState<string>('');
  const [dropiProductIdsMap, setDropiProductIdsMap] = useState<Record<string, string>>({});
  const [isApprovingDropi, setIsApprovingDropi] = useState<boolean>(false);
  const [dropiApprovalError, setDropiApprovalError] = useState<string | null>(null);
  const [dropiApprovalSuccess, setDropiApprovalSuccess] = useState<{
    dropi_order_id?: string | number;
    dropi_guia?: string;
    carrier?: string;
    message?: string;
  } | null>(null);
  
  // Product Quick-View / Inspector Modal State
  const [inspectingProduct, setInspectingProduct] = useState<{
    product: Product;
    item?: OrderItem;
  } | null>(null);

  // Manual Order Form State
  const [manualForm, setManualForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    department: 'Bogotá D.C.',
    city: 'Bogotá D.C.',
    address: '',
    additionalNotes: '',
    shippingCost: 0,
    carrier: 'Servientrega',
    status: 'pendiente' as OrderStatus
  });

  // Items added to manual order
  const [manualItems, setManualItems] = useState<OrderItem[]>(() => {
    if (products.length > 0) {
      const p = products[0];
      return [{
        id: `item-${Date.now()}`,
        productId: p.id,
        title: p.title,
        quantity: 1,
        unitPrice: p.price,
        unitCost: p.costPrice || Math.round(p.price * 0.5),
        subtotal: p.price,
        image: p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
      }];
    }
    return [];
  });

  // State for adding another product in manual order modal
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>(products[0]?.id || '');
  const [selectedCatalogVariantId, setSelectedCatalogVariantId] = useState<string>('');
  const [selectedCatalogQuantity, setSelectedCatalogQuantity] = useState<number>(1);

  const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'PENDIENTE_REVISION', label: '⏳ Pendiente Revisión' },
    { value: 'APROBADO_DROPI', label: '🚀 Aprobado en Dropi' },
    { value: 'ERROR_DROPI', label: '❌ Error en Dropi' },
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'pago_confirmado', label: 'Pago Confirmado' },
    { value: 'procesando', label: 'En Preparación' },
    { value: 'enviado', label: 'En Camino / Con Guía' },
    { value: 'entregado', label: 'Entregados' },
    { value: 'CANCELADO', label: 'Cancelados' }
  ];

  const carriers = ['Servientrega', 'Coordinadora', 'Envía', 'Interrapidísimo', 'TCC'];

  // Open Dropi Manual Order Approval & Logistics Review
  const handleOpenDropiModal = (order: Order) => {
    setDropiModalOrder(order);
    setDropiSelectedCarrier(order.carrier || 'Servientrega');
    setDropiCustomDaneCode(order.dane_code || getDaneCode(order.city, order.department));
    setDropiApprovalError(null);
    setDropiApprovalSuccess(null);

    // Pre-populate product IDs map
    const initialMap: Record<string, string> = {};
    const safeOrderItems = parseOrderItems(order.items);
    safeOrderItems.forEach(item => {
      const matchedProd = findProductForItem(item);
      const prodId = item.productId || matchedProd.id;
      const val = item.dropi_product_id ?? matchedProd.dropi_product_id ?? '';
      initialMap[prodId] = String(val);
    });
    setDropiProductIdsMap(initialMap);
  };

  const handleApproveOrderForDropi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dropiModalOrder) return;

    setIsApprovingDropi(true);
    setDropiApprovalError(null);
    setDropiApprovalSuccess(null);

    try {
      // Build items with updated dropi_product_id
      const safeModalItems = parseOrderItems(dropiModalOrder.items);
      const resolvedItems = safeModalItems.map(item => {
        const matchedProd = findProductForItem(item);
        const prodId = item.productId || matchedProd.id;
        const mappedDropiId = dropiProductIdsMap[prodId] || item.dropi_product_id || matchedProd.dropi_product_id || '';
        return {
          ...item,
          dropi_product_id: mappedDropiId
        };
      });

      const payload = {
        orderId: dropiModalOrder.id,
        carrier: dropiSelectedCarrier,
        dane_code: dropiCustomDaneCode || getDaneCode(dropiModalOrder.city, dropiModalOrder.department),
        items: resolvedItems
      };

      const res = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error_message || data.message || 'Error al transmitir la orden a Dropi');
      }

      setDropiApprovalSuccess({
        dropi_order_id: data.data?.dropi_order_id || data.dropi_order_id,
        dropi_guia: data.data?.dropi_guia || data.dropi_guia,
        carrier: data.data?.carrier || dropiSelectedCarrier,
        message: data.message || '¡Orden aprobada y sincronizada exitosamente con Dropi Colombia!'
      });

      // Update selected order in case detail is open
      if (selectedOrder?.id === dropiModalOrder.id && data.data) {
        setSelectedOrder(data.data);
      }

      onRefresh();
    } catch (err: any) {
      setDropiApprovalError(err.message || 'No se pudo conectar con la API de Dropi Colombia');
      onRefresh();
    } finally {
      setIsApprovingDropi(false);
    }
  };

  // Helper to find real product matching an order item
  const findProductForItem = (item?: OrderItem | any): Product => {
    if (!item) {
      return {
        id: 'prod-custom',
        title: 'Producto Zavela',
        slug: 'producto',
        description: 'Producto registrado en el pedido contra entrega.',
        price: 0,
        costPrice: 0,
        stock: 50,
        active: true,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
        tags: ['contraentrega'],
        categoryName: 'General',
        variants: []
      };
    }

    const itemProdId = String(item.productId || item.product_id || item.id || '');
    const directMatch = products.find(p => p.id === itemProdId || p.slug === itemProdId);
    if (directMatch) return directMatch;

    const itemTitle = String(item.title || item.productTitle || item.nombre || item.name || '').toLowerCase().trim();
    if (itemTitle) {
      const titleMatch = products.find(p => (p.title || '').toLowerCase().trim() === itemTitle);
      if (titleMatch) return titleMatch;
    }

    // Synthesize fallback product object for inspection
    return {
      id: itemProdId || 'prod-custom',
      title: item.title || item.productTitle || item.nombre || 'Producto Zavela',
      slug: 'producto',
      description: 'Producto registrado en el pedido contra entrega.',
      price: Number(item.unitPrice || item.subtotal || item.precio) || 0,
      costPrice: Number(item.unitCost || item.costPrice || item.costo) || Math.round((Number(item.unitPrice || item.subtotal || item.precio) || 0) * 0.5),
      stock: 50,
      active: true,
      images: item.image ? [item.image] : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
      tags: ['contraentrega'],
      categoryName: 'General',
      variants: item.variantName ? [{
        id: item.variantId || 'var-1',
        productId: itemProdId,
        name: item.variantName,
        price: Number(item.unitPrice || item.precio) || 0,
        stock: 50
      }] : []
    };
  };

  const handleInspectProduct = (item: OrderItem) => {
    const product = findProductForItem(item);
    setInspectingProduct({ product, item });
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus, customCarrier?: string, customTracking?: string) => {
    setIsProcessing(orderId);
    try {
      const payload: any = { status: newStatus };
      if (customCarrier !== undefined) payload.carrier = customCarrier;
      if (customTracking !== undefined) payload.trackingNumber = customTracking;

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al actualizar pedido');
      onRefresh();
      if (selectedOrder?.id === orderId && data.data) {
        setSelectedOrder(data.data);
      }
    } catch (err: any) {
      alert(err.message || 'Error al actualizar pedido');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSaveEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setIsProcessing(editingOrder.id);
    try {
      const res = await fetch(`/api/admin/orders/${editingOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingOrder)
      });
      if (!res.ok) throw new Error('Error al modificar pedido');
      setEditingOrder(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al guardar cambios');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAddManualItem = () => {
    const prod = products.find(p => p.id === selectedCatalogProductId);
    if (!prod) return;

    const variant = prod.variants?.find(v => v.id === selectedCatalogVariantId);
    const unitPrice = variant?.price || prod.price;
    const unitCost = variant?.costPrice || prod.costPrice || Math.round(unitPrice * 0.5);

    const newItem: OrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: prod.id,
      variantId: variant?.id,
      title: prod.title,
      variantName: variant?.name,
      quantity: selectedCatalogQuantity,
      unitPrice,
      unitCost,
      subtotal: unitPrice * selectedCatalogQuantity,
      image: prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
    };

    setManualItems(prev => [...prev, newItem]);
    setSelectedCatalogQuantity(1);
  };

  const handleRemoveManualItem = (idx: number) => {
    setManualItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.customerName || !manualForm.customerPhone || !manualForm.address) {
      alert('Por favor completa nombre, teléfono y dirección');
      return;
    }

    if (manualItems.length === 0) {
      alert('Debes agregar al menos un producto a la orden');
      return;
    }

    const calculatedSubtotal = manualItems.reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0);
    const calculatedCost = manualItems.reduce((acc, it) => acc + ((it.unitCost || 0) * it.quantity), 0);

    setIsProcessing('create');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          subtotal: calculatedSubtotal,
          productCostTotal: calculatedCost,
          items: manualItems
        })
      });
      if (!res.ok) throw new Error('Error al crear pedido manual');
      setIsCreatingOrder(false);
      setManualForm({
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        department: 'Bogotá D.C.',
        city: 'Bogotá D.C.',
        address: '',
        additionalNotes: '',
        shippingCost: 0,
        carrier: 'Servientrega',
        status: 'pendiente'
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al crear pedido');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteOrder = async (id: string, orderNumber: string) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente el pedido ${orderNumber}?`)) return;

    setIsProcessing(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar pedido');
      if (selectedOrder?.id === id) setSelectedOrder(null);
      if (editingOrder?.id === id) setEditingOrder(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSimulate3Sales = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/admin/orders/simulate-3-per-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al simular ventas');
      alert(`¡Éxito! Se simularon 3 ventas por cada producto (${data.data?.ordersCount || 0} pedidos).`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al simular');
    } finally {
      setIsSimulating(false);
    }
  };

  const executeClearSales = async () => {
    setIsClearing(true);
    setShowClearConfirmModal(false);
    try {
      await fetch('/api/admin/clean-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const res = await fetch('/api/admin/orders/clear-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al borrar');
      if (selectedOrder) setSelectedOrder(null);
      if (editingOrder) setEditingOrder(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error al borrar');
    } finally {
      setIsClearing(false);
    }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Normalización segura de la lista de pedidos entrantes
  const safeOrdersList = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.map(o => normalizeOrderSafe(o));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return safeOrdersList.filter((o) => {
      const orderStatus = String(o.status || (o as any).estado || '').toLowerCase().trim();
      if (statusFilter !== 'all' && orderStatus !== statusFilter.toLowerCase().trim()) return false;
      
      // Date filter
      const orderDateStr = o.createdAt || (o as any).created_at || (o as any).fecha;
      if (orderDateStr) {
        const orderDate = new Date(orderDateStr);
        if (!isNaN(orderDate.getTime())) {
          if (dateFilter === 'today' && orderDate < startOfToday) return false;
          if (dateFilter === 'month' && orderDate < startOfMonth) return false;
        }
      }

      if (!search.trim()) return true;
      const q = (search || '').toLowerCase().trim();
      
      // Check if any product title matches search
      const orderItems = parseOrderItems(o.items);
      const hasMatchingProduct = orderItems.some(it => 
        String(it?.title || '').toLowerCase().includes(q) || 
        String(it?.variantName || '').toLowerCase().includes(q) ||
        String(it?.productId || '').toLowerCase().includes(q)
      );

      return (
        String(o.orderNumber || (o as any).numero_pedido || (o as any).order_number || '').toLowerCase().includes(q) ||
        String(o.customerName || (o as any).cliente_nombre || (o as any).nombre_cliente || (o as any).cliente || '').toLowerCase().includes(q) ||
        String(o.customerPhone || (o as any).cliente_telefono || (o as any).telefono || '').includes(q) ||
        String(o.customerEmail || (o as any).cliente_email || (o as any).email || '').toLowerCase().includes(q) ||
        String(o.trackingNumber || (o as any).dropi_guia || (o as any).guia || '').toLowerCase().includes(q) ||
        String(o.carrier || (o as any).transportadora || '').toLowerCase().includes(q) ||
        String(o.city || (o as any).cliente_ciudad || (o as any).ciudad || '').toLowerCase().includes(q) ||
        String(o.department || (o as any).cliente_departamento || (o as any).departamento || '').toLowerCase().includes(q) ||
        String(o.address || (o as any).cliente_direccion || (o as any).direccion || '').toLowerCase().includes(q) ||
        String(o.paymentMethod || (o as any).metodo_pago || '').toLowerCase().includes(q) ||
        hasMatchingProduct
      );
    });
  }, [safeOrdersList, statusFilter, dateFilter, search, startOfToday, startOfMonth]);

  const totalFilteredSales = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalFilteredCost = filteredOrders.reduce((sum, o) => sum + (o.productCostTotal || 0), 0);
  const totalFilteredProfit = totalFilteredSales - totalFilteredCost;

  const pendingDropiCount = safeOrdersList.filter(o => {
    const st = String(o.status || (o as any).estado || '').toLowerCase().trim();
    return (
      st === 'pendiente_revision' || 
      st === 'pendiente' || 
      (!o.dropi_order_id && st !== 'aprobado_dropi' && st !== 'cancelado')
    );
  }).length;

  return (
    <div className="space-y-6">

      {/* Dropi Pending Orders Dedicated Section Banner */}
      {pendingDropiCount > 0 && onNavigate && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 rounded-2xl text-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-xs sm:text-sm text-slate-950 flex items-center gap-2">
                <span>Tienes {pendingDropiCount} pedido{pendingDropiCount > 1 ? 's' : ''} pendiente{pendingDropiCount > 1 ? 's' : ''} por revisión y autorizar para Dropi</span>
                <span className="bg-slate-950 text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">NUEVA SECCIÓN</span>
              </div>
              <p className="text-[11px] text-slate-900 font-medium">
                Accede al nuevo centro de control con validación de códigos DANE y mapeo de IDs de Dropi.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('pending_dropi_orders')}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
          >
            <span>Ir a Revisión & Autorizar Dropi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      
      {/* Header with Title and Create Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Gestión de Pedidos Contra Entrega</span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
              {orders.length} pedidos
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Revisa exactamente qué compró cada cliente, abre los enlaces directos a cada producto, genera comprobantes o actualiza despachos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-simulate-custom-orders"
            onClick={() => setShowSimulatorModal(true)}
            disabled={isSimulating || isClearing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Configurar cantidad de ventas, fletes de transportadoras y cobros Dropi"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulador de Ventas & Costos</span>
          </button>

          <button
            id="btn-clear-sales-orders"
            onClick={() => setShowClearConfirmModal(true)}
            disabled={isSimulating || isClearing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            title="Borrar todas las ventas registradas y simulaciones"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Borrar Ventas / Pruebas</span>
          </button>

          <button
            id="btn-create-manual-order"
            onClick={() => {
              if (products.length > 0 && manualItems.length === 0) {
                const p = products[0];
                setManualItems([{
                  id: `item-${Date.now()}`,
                  productId: p.id,
                  title: p.title,
                  quantity: 1,
                  unitPrice: p.price,
                  unitCost: p.costPrice || Math.round(p.price * 0.5),
                  subtotal: p.price,
                  image: p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
                }]);
              }
              setIsCreatingOrder(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Pedido</span>
          </button>
        </div>
      </div>

      {/* Financial Mini-Summary for current filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-xs">
        <div>
          <div className="text-[10px] uppercase font-bold text-cyan-400">Total Pedidos Mostrados</div>
          <div className="text-lg sm:text-xl font-black font-mono mt-0.5">{filteredOrders.length} ventas</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Ingresos Totales (Venta)</div>
          <div className="text-lg sm:text-xl font-black font-mono text-white mt-0.5">{formatCOP(totalFilteredSales)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400">Costo de Ventas (Mercancía)</div>
          <div className="text-lg sm:text-xl font-black font-mono text-slate-300 mt-0.5">{formatCOP(totalFilteredCost)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-emerald-400">Ganancia Neta Calculada</div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5">+{formatCOP(totalFilteredProfit)}</div>
        </div>
      </div>

      {/* Controls Bar: Search & Date / Status Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por # Pedido, Producto comprado, Cliente, Celular, Guía..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-hidden text-slate-800"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas las Fechas ({orders.length})
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'today' ? 'bg-white text-cyan-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ventas de Hoy ({orders.filter(o => new Date(o.createdAt) >= startOfToday).length})
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                dateFilter === 'month' ? 'bg-white text-indigo-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Este Mes ({orders.filter(o => new Date(o.createdAt) >= startOfMonth).length})
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === opt.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table with Dedicated "Artículos Comprados / ¿Qué Compró?" Column */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Pedido</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5 min-w-[260px]">¿Qué Compró? (Artículos & Enlace)</th>
                <th className="px-4 py-3.5">Destino</th>
                <th className="px-4 py-3.5">Total Recaudar</th>
                <th className="px-4 py-3.5">Guía / Logística</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No se encontraron pedidos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const orderItems = order.items && order.items.length > 0 ? order.items : [
                    {
                      id: `fallback-${order.id}`,
                      productId: 'prod-101',
                      title: 'Producto Registrado Zavela',
                      quantity: 1,
                      unitPrice: order.total || order.subtotal || 0,
                      subtotal: order.total || order.subtotal || 0,
                      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
                    }
                  ];

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors align-top">
                      
                      {/* 1. Order Number & Date */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {order.orderNumber}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </td>

                      {/* 2. Customer Info */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800">{order.customerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-cyan-600" />
                          <a 
                            href={`https://wa.me/57${order.customerPhone?.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(order.customerName || '')},%20te%20escribimos%20de%20Zavela%20Store%20sobre%20tu%20pedido%20${order.orderNumber}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-cyan-700 hover:underline font-mono"
                            title="Chatear por WhatsApp"
                          >
                            {order.customerPhone}
                          </a>
                        </div>
                      </td>

                      {/* 3. DEDICATED COLUMN: ¿QUÉ COMPRÓ? WITH DIRECT PRODUCT LINKS & THUMBNAILS */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-2">
                          {orderItems.map((item, idx) => {
                            const matchedProduct = findProductForItem(item);
                            const itemImage = item.image || matchedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';

                            return (
                              <div 
                                key={idx}
                                className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-cyan-300 hover:bg-cyan-50/30 transition-all group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Product Thumbnail with click to inspect */}
                                  <button
                                    type="button"
                                    onClick={() => handleInspectProduct(item)}
                                    className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white group-hover:scale-105 transition-transform cursor-pointer"
                                    title="Ver foto y ficha técnica"
                                  >
                                    <img 
                                      src={itemImage} 
                                      alt={item.title} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
                                      }}
                                    />
                                    <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white font-mono text-[9px] font-bold px-1 rounded-tl">
                                      x{item.quantity}
                                    </span>
                                  </button>

                                  {/* Product Title and Details */}
                                  <div className="min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleInspectProduct(item)}
                                      className="text-left font-bold text-slate-800 hover:text-cyan-600 transition-colors line-clamp-1 cursor-pointer block text-xs"
                                      title={item.title}
                                    >
                                      {item.title}
                                    </button>
                                    
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                      {item.variantName && (
                                        <span className="text-[10px] bg-cyan-100 text-cyan-900 px-1.5 py-0.2 rounded font-medium truncate max-w-[130px]">
                                          {item.variantName}
                                        </span>
                                      )}
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {formatCOP(item.subtotal || item.unitPrice * item.quantity)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Direct Clickable Product Link Button */}
                                <button
                                  type="button"
                                  onClick={() => handleInspectProduct(item)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-cyan-600 text-cyan-700 hover:text-white border border-cyan-200 hover:border-cyan-600 text-[10px] font-bold shadow-2xs transition-all cursor-pointer shrink-0"
                                  title="Abrir detalles de lo que compró"
                                >
                                  <span>Ver Producto</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* 4. Shipping Destination */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-semibold">{order.city}, {order.department}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px] mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span title={order.address}>{order.address}</span>
                        </div>
                      </td>

                      {/* 5. Total COP and Gross Margin */}
                      <td className="px-4 py-3.5">
                        <div className="font-black text-slate-900 text-sm">{formatCOP(order.total || order.subtotal || 0)}</div>
                        <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 mt-0.5">
                          <TrendingUp className="w-2.5 h-2.5" />
                          <span>+{formatCOP(order.grossMargin || Math.round((order.total || 0) * 0.4))} ganancia</span>
                        </div>
                      </td>

                      {/* 6. Carrier & Tracking / Dropi Logistics */}
                      <td className="px-4 py-3.5">
                        {order.status === 'APROBADO_DROPI' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{order.carrier || 'Dropi Express'}</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block font-bold">
                              Guía: {order.dropi_guia || order.trackingNumber || 'Asignada'}
                            </div>
                            {order.dropi_order_id && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Dropi ID: #{order.dropi_order_id}
                              </div>
                            )}
                          </div>
                        ) : order.status === 'ERROR_DROPI' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 font-bold text-rose-800 text-xs">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Error al sincronizar</span>
                            </div>
                            <div 
                              className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 p-1 rounded-md line-clamp-2"
                              title={order.error_message || 'Rechazado por Dropi'}
                            >
                              {order.error_message || 'Falta ID de Dropi o datos incompletos'}
                            </div>
                          </div>
                        ) : order.trackingNumber ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-cyan-900 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-cyan-600" />
                              <span>{order.carrier || 'Transportadora'}</span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 inline-block font-semibold">
                              {order.trackingNumber}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-300" />
                              <span>Sin guía asignada</span>
                            </span>
                            <div className="text-[10px] text-cyan-700 font-medium">
                              {order.carrier ? `Pref: ${order.carrier}` : 'Servientrega (por defecto)'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. Status Selector */}
                      <td className="px-4 py-3.5">
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                          disabled={isProcessing === order.id}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer outline-hidden transition-all ${
                            order.status === 'APROBADO_DROPI' || order.status === 'entregado' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            order.status === 'PENDIENTE_REVISION' || order.status === 'pendiente' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                            order.status === 'ERROR_DROPI' || order.status === 'CANCELADO' || order.status === 'cancelado' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                            order.status === 'enviado' ? 'bg-cyan-50 text-cyan-800 border-cyan-300' :
                            'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                        >
                          <option value="PENDIENTE_REVISION">⏳ Pendiente Revisión</option>
                          <option value="APROBADO_DROPI">🚀 Aprobado Dropi</option>
                          <option value="ERROR_DROPI">❌ Error Dropi</option>
                          <option value="pendiente">Pendiente</option>
                          <option value="pago_confirmado">Pago Confirmado</option>
                          <option value="procesando">En Preparación</option>
                          <option value="enviado">Enviado / En Ruta</option>
                          <option value="entregado">Entregado</option>
                          <option value="CANCELADO">Cancelado</option>
                        </select>
                      </td>

                      {/* 8. Action Buttons & Dropi Approval Trigger */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-1.5">
                          
                          {/* Dropi Approval Action Button */}
                          {(order.status === 'PENDIENTE_REVISION' || order.status === 'pendiente' || order.status === 'ERROR_DROPI') ? (
                            <button
                              id={`btn-dropi-approve-${order.id}`}
                              onClick={() => handleOpenDropiModal(order)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap"
                              title="Revisar datos del cliente y transmitir orden a Dropi Colombia"
                            >
                              <Send className="w-3 h-3 text-cyan-200" />
                              <span>{order.status === 'ERROR_DROPI' ? 'Reintentar Dropi' : 'Revisar & Enviar Dropi'}</span>
                            </button>
                          ) : order.status === 'APROBADO_DROPI' ? (
                            <button
                              onClick={() => handleOpenDropiModal(order)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                              title="Ver ficha de transmisión de Dropi"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ficha Dropi</span>
                            </button>
                          ) : null}

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Ver Detalle Completo e Imprimir Comprobante"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingOrder(order)}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                              title="Modificar Datos de Entrega o Guía"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: PRODUCT QUICK-VIEW / INSPECTOR (Se abre cuando el admin hace clic en el producto comprado) */}
      {inspectingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-cyan-600 uppercase font-mono tracking-wider">
                    Ficha Técnica de lo Comprado
                  </span>
                  <h3 className="font-black text-base text-slate-900">
                    {inspectingProduct.product.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setInspectingProduct(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Body: Gallery + Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              {/* Product Photos */}
              <div className="space-y-2">
                <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative">
                  <img 
                    src={inspectingProduct.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'} 
                    alt={inspectingProduct.product.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-slate-950/80 text-cyan-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border border-cyan-500/30">
                    ID: {inspectingProduct.product.id}
                  </div>
                </div>

                {inspectingProduct.product.images && inspectingProduct.product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {inspectingProduct.product.images.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial & Logistics Info */}
              <div className="space-y-3 flex flex-col justify-between">
                
                <div className="space-y-3">
                  {/* Category & Brand Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-lg font-bold text-[10px]">
                      📂 {inspectingProduct.product.categoryName || 'Categoría General'}
                    </span>
                    <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-1 rounded-lg font-bold text-[10px]">
                      🏷️ {inspectingProduct.product.brand || 'Zavela Oficial'}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg font-bold text-[10px]">
                      📦 Stock: {inspectingProduct.product.stock} unidades
                    </span>
                  </div>

                  {/* Financial Breakdown Card */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                      <span className="text-slate-500 font-medium">Precio de Venta al Cliente:</span>
                      <span className="font-black text-slate-950 text-sm">
                        {formatCOP(inspectingProduct.product.price)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                      <span className="text-slate-500 font-medium">Costo Base Proveedor / Bodega:</span>
                      <span className="font-bold text-slate-700">
                        {formatCOP(inspectingProduct.product.costPrice || Math.round(inspectingProduct.product.price * 0.5))}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-emerald-800 font-bold">Ganancia Neta por Unidad:</span>
                      <span className="font-black text-emerald-700 text-sm">
                        +{formatCOP((inspectingProduct.product.price - (inspectingProduct.product.costPrice || Math.round(inspectingProduct.product.price * 0.5))))}
                      </span>
                    </div>
                  </div>

                  {/* Product Variants (if any) */}
                  {inspectingProduct.product.variants && inspectingProduct.product.variants.length > 0 && (
                    <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-100">
                      <span className="font-bold text-cyan-950 block mb-1.5 text-[11px]">Variantes Disponibles:</span>
                      <div className="space-y-1">
                        {inspectingProduct.product.variants.map((v, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] bg-white p-1.5 rounded-lg border border-cyan-100">
                            <span className="font-medium text-slate-800">• {v.name}</span>
                            <span className="font-mono text-slate-600 font-bold">{formatCOP(v.price || inspectingProduct.product.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Short Description */}
                  <div>
                    <span className="font-bold text-slate-700 block mb-1 text-[11px]">Descripción / Características:</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-28 overflow-y-auto">
                      {inspectingProduct.product.description || inspectingProduct.product.shortDescription || 'Sin descripción adicional registrada.'}
                    </p>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  {onEditProduct ? (
                    <button
                      type="button"
                      onClick={() => {
                        const prod = inspectingProduct.product;
                        setInspectingProduct(null);
                        onEditProduct(prod);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 cursor-pointer transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar este Producto en Catálogo</span>
                    </button>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => setInspectingProduct(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cerrar Vista
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: CREATE MANUAL ORDER WITH REAL PRODUCT SELECTION */}
      {isCreatingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Crear Nuevo Pedido Manual</h3>
                <p className="text-xs text-slate-500">Selecciona productos de tu catálogo para que queden vinculados</p>
              </div>
              <button
                onClick={() => setIsCreatingOrder(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualOrder} className="space-y-4 text-xs">
              
              {/* Product Selector Section */}
              <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-cyan-950 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-cyan-600" />
                    <span>Seleccionar Productos Comprados</span>
                  </span>
                  <span className="text-[10px] font-bold text-cyan-800 font-mono">
                    {manualItems.length} agregado{manualItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Producto</label>
                    <select
                      value={selectedCatalogProductId}
                      onChange={(e) => {
                        setSelectedCatalogProductId(e.target.value);
                        setSelectedCatalogVariantId('');
                      }}
                      className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-medium"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.title} - ({formatCOP(p.price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Cantidad</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={selectedCatalogQuantity}
                        onChange={(e) => setSelectedCatalogQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer shrink-0"
                        title="Agregar a la lista"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Added Items List */}
                <div className="space-y-1.5 pt-1">
                  {manualItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-xl border border-cyan-100 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <img 
                          src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'} 
                          alt="" 
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200" 
                        />
                        <div>
                          <div className="font-bold text-slate-800 line-clamp-1">{item.title}</div>
                          <div className="text-[10px] text-slate-500">
                            {item.quantity} un. x {formatCOP(item.unitPrice)} = <strong className="text-slate-900 font-mono">{formatCOP(item.subtotal || item.unitPrice * item.quantity)}</strong>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveManualItem(idx)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Quitar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.customerName}
                    onChange={(e) => setManualForm({ ...manualForm, customerName: e.target.value })}
                    placeholder="Ej. María Fernanda Gómez"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Celular / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={manualForm.customerPhone}
                    onChange={(e) => setManualForm({ ...manualForm, customerPhone: e.target.value })}
                    placeholder="Ej. 3101234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={manualForm.department}
                    onChange={(e) => setManualForm({ ...manualForm, department: e.target.value })}
                    placeholder="Ej. Antioquia"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad / Municipio</label>
                  <input
                    type="text"
                    value={manualForm.city}
                    onChange={(e) => setManualForm({ ...manualForm, city: e.target.value })}
                    placeholder="Ej. Medellín"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección de Entrega Completa *</label>
                <input
                  type="text"
                  required
                  value={manualForm.address}
                  onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
                  placeholder="Calle, Carrera, Número, Barrio, Apto o Torre"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transportadora Preferida</label>
                  <select
                    value={manualForm.carrier}
                    onChange={(e) => setManualForm({ ...manualForm, carrier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  >
                    {carriers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total a Recaudar</label>
                  <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-black text-slate-900">
                    {formatCOP(manualItems.reduce((acc, it) => acc + (it.subtotal || it.unitPrice * it.quantity), 0))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas o Referencias</label>
                <textarea
                  rows={2}
                  value={manualForm.additionalNotes}
                  onChange={(e) => setManualForm({ ...manualForm, additionalNotes: e.target.value })}
                  placeholder="Instrucciones para la transportadora o el repartidor..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingOrder(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing === 'create'}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  {isProcessing === 'create' ? 'Creando Pedido...' : 'Guardar y Vincular Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ORDER */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Modificar Pedido {editingOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">Actualiza datos de entrega, número de guía o transportadora</p>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={editingOrder.customerName}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Celular</label>
                  <input
                    type="tel"
                    value={editingOrder.customerPhone}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={editingOrder.city}
                    onChange={(e) => setEditingOrder({ ...editingOrder, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={editingOrder.department}
                    onChange={(e) => setEditingOrder({ ...editingOrder, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={editingOrder.address}
                  onChange={(e) => setEditingOrder({ ...editingOrder, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transportadora</label>
                  <select
                    value={editingOrder.carrier || 'Servientrega'}
                    onChange={(e) => setEditingOrder({ ...editingOrder, carrier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
                  >
                    {carriers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número de Guía</label>
                  <input
                    type="text"
                    value={editingOrder.trackingNumber || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, trackingNumber: e.target.value })}
                    placeholder="Ej. SER-987654321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  Guardar Modificaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW ORDER DETAIL & PRINT RECEIPT WITH PRODUCT LINKS */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-200">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-cyan-600 uppercase font-mono">Comprobante de Despacho & Productos</span>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Pedido {selectedOrder.orderNumber}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-4 text-xs">
              
              {/* Recipient & Destination Grid */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Destinatario</span>
                  <span className="font-bold text-slate-900 text-sm block">{selectedOrder.customerName}</span>
                  <span className="text-slate-600 block mt-0.5 font-mono">📞 {selectedOrder.customerPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Destino</span>
                  <span className="font-bold text-slate-900 block">{selectedOrder.city}, {selectedOrder.department}</span>
                  <span className="text-slate-600 block text-[11px] mt-0.5">{selectedOrder.address}</span>
                </div>
              </div>

              {/* Items List with Interactive Product Links */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-700 text-[11px] flex justify-between items-center">
                  <span>Productos en este envío ({selectedOrder.items?.length || 1})</span>
                  <span className="text-[10px] text-cyan-700 font-medium">Haz clic en cualquier producto para inspeccionarlo</span>
                </div>

                <div className="divide-y divide-slate-100 p-3 space-y-2">
                  {(selectedOrder.items || []).map((item, idx) => {
                    const matchedProduct = findProductForItem(item);
                    const itemImage = item.image || matchedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';

                    return (
                      <div key={idx} className="flex items-center justify-between gap-3 pt-2 group">
                        
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleInspectProduct(item)}
                            className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 cursor-pointer group-hover:scale-105 transition-transform"
                          >
                            <img src={itemImage} alt={item.title} className="w-full h-full object-cover" />
                          </button>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleInspectProduct(item)}
                              className="font-bold text-slate-900 hover:text-cyan-600 text-left transition-colors cursor-pointer block line-clamp-1"
                            >
                              {item.title}
                            </button>
                            {item.variantName && (
                              <span className="text-[10px] text-cyan-700 font-medium block">
                                Variante: {item.variantName}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                              Cantidad: {item.quantity} un. × {formatCOP(item.unitPrice)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-black text-slate-900 font-mono text-sm">
                              {formatCOP(item.subtotal || item.unitPrice * item.quantity)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleInspectProduct(item)}
                              className="text-[10px] text-cyan-600 hover:text-cyan-800 font-bold flex items-center gap-0.5 justify-end mt-0.5 cursor-pointer"
                            >
                              <span>Ver Ficha</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-cyan-50/50 p-4 rounded-2xl border border-cyan-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Total a recaudar contra entrega</span>
                  <span className="text-[10px] text-slate-500">En efectivo o transferencia al recibir en destino</span>
                </div>
                <div className="text-xl font-black text-slate-950 font-mono">
                  {formatCOP(selectedOrder.total || selectedOrder.subtotal || 0)}
                </div>
              </div>

              {/* Carrier Info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 text-slate-700 text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-cyan-600" />
                  <span>Transportadora: <strong>{selectedOrder.carrier || 'No asignada'}</strong></span>
                </div>
                <div>
                  Guía: <strong className="font-mono">{selectedOrder.dropi_guia || selectedOrder.trackingNumber || 'Pendiente'}</strong>
                </div>
              </div>

              {/* Dropi Quick Action in Order View */}
              {selectedOrder.status !== 'APROBADO_DROPI' ? (
                <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-700 shrink-0" />
                    <div>
                      <div className="font-bold text-cyan-950 text-xs">Sincronización con Dropi Colombia</div>
                      <div className="text-[11px] text-cyan-800">Revisa la orden y transmítela directamente a Dropi para generar la guía.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      handleOpenDropiModal(ord);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Aprobar en Dropi</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold text-emerald-950 text-xs">Aprobado en Dropi Colombia</div>
                      <div className="text-[11px] text-emerald-800">
                        Dropi ID: #{selectedOrder.dropi_order_id || 'N/A'} • Guía: {selectedOrder.dropi_guia || selectedOrder.trackingNumber || 'Pendiente'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-200/60 text-emerald-900 font-bold text-[10px]">
                    Sincronizado
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DROPI COLOMBIA MANUAL ORDER APPROVAL & TRANSMISSION */}
      {dropiModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-cyan-600 uppercase font-mono tracking-wider">
                      Integración Dropi Colombia
                    </span>
                    <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                      dropiModalOrder.status === 'APROBADO_DROPI' ? 'bg-emerald-100 text-emerald-800' :
                      dropiModalOrder.status === 'ERROR_DROPI' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {dropiModalOrder.status}
                    </span>
                  </div>
                  <h3 className="font-black text-base text-slate-900">
                    Aprobar y Enviar Pedido {dropiModalOrder.orderNumber}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setDropiModalOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success State Screen */}
            {dropiApprovalSuccess ? (
              <div className="space-y-4 py-3 text-center">
                <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-slate-900">¡Pedido Transmitido con Éxito a Dropi!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {dropiApprovalSuccess.message}
                  </p>
                </div>

                {/* Dropi Summary Badge Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-3 gap-3 text-left max-w-lg mx-auto">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Dropi Order ID</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      #{dropiApprovalSuccess.dropi_order_id || 'Generado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Guía de Despacho</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {dropiApprovalSuccess.dropi_guia || 'En proceso'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Transportadora</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {dropiApprovalSuccess.carrier}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setDropiModalOrder(null)}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
                  >
                    Entendido, Volver a la Lista
                  </button>
                </div>
              </div>
            ) : (
              /* Review & Approval Form */
              <form onSubmit={handleApproveOrderForDropi} className="space-y-4 text-xs">
                
                {/* Error Banner if Dropi failed */}
                {dropiApprovalError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold">Error devuelto por la API de Dropi:</div>
                      <div className="text-[11px] mt-0.5">{dropiApprovalError}</div>
                      <div className="text-[10px] text-rose-600 mt-1 font-medium">
                        💡 Verifica que cada producto tenga su `dropi_product_id` configurado y que la dirección/código DANE sean válidos.
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid 1: Customer Data Verification */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Datos del Destinatario (Cliente)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Venta #{dropiModalOrder.orderNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">Nombre Completo:</span>
                      <span className="font-bold text-slate-900">{dropiModalOrder.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">Celular / Teléfono:</span>
                      <span className="font-mono font-bold text-slate-900">{dropiModalOrder.customerPhone}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-bold text-slate-500 block">Dirección de Entrega:</span>
                      <span className="font-medium text-slate-800">{dropiModalOrder.address}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">Ciudad & Departamento:</span>
                      <span className="font-bold text-slate-800">{dropiModalOrder.city}, {dropiModalOrder.department}</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Código DANE Municipio *
                      </label>
                      <input
                        type="text"
                        required
                        value={dropiCustomDaneCode}
                        onChange={(e) => setDropiCustomDaneCode(e.target.value)}
                        placeholder="Ej. 11001"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:border-cyan-500 outline-hidden font-bold"
                      />
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Autocalculado para {dropiModalOrder.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid 2: Logistics & Carrier Selection */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Transportadora y Parámetros Dropi</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Cobro Contra Entrega (true)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Transportadora Asignada para el Envío *
                      </label>
                      <select
                        value={dropiSelectedCarrier}
                        onChange={(e) => setDropiSelectedCarrier(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:border-cyan-500 outline-hidden cursor-pointer"
                      >
                        {carriers.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Total a Recaudar por la Transportadora
                      </label>
                      <div className="px-3 py-2 bg-slate-200/70 border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm">
                        {formatCOP(dropiModalOrder.total || dropiModalOrder.subtotal || 0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid 3: Products Mapping & Dropi Product IDs */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between font-bold text-slate-800 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Productos del Pedido y Mapeo Dropi ({dropiModalOrder.items?.length || 1})</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Cada producto debe tener su Dropi Product ID
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 p-3 space-y-2.5">
                    {(dropiModalOrder.items || []).map((item, idx) => {
                      const matchedProd = findProductForItem(item);
                      const prodId = item.productId || matchedProd.id;
                      const currentDropiId = dropiProductIdsMap[prodId] || item.dropi_product_id || matchedProd.dropi_product_id || '';
                      const isMissingDropiId = !currentDropiId;

                      return (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <img 
                                src={item.image || matchedProd.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" 
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                                <div className="text-[10px] text-slate-500">
                                  {item.quantity} unidad{item.quantity > 1 ? 'es' : ''} • Precio: {formatCOP(item.unitPrice)}
                                  {item.variantName && ` • Var: ${item.variantName}`}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold text-slate-900">
                                {formatCOP(item.subtotal || item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          </div>

                          {/* Inline Dropi Product ID Input / Verifier */}
                          <div className="pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5">
                              {isMissingDropiId ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Falta ID Dropi</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-mono">
                                  <Check className="w-3 h-3" />
                                  <span>Mapeado: {currentDropiId}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                              <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                Dropi Product ID:
                              </label>
                              <input
                                type="text"
                                value={currentDropiId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDropiProductIdsMap(prev => ({
                                    ...prev,
                                    [prodId]: val
                                  }));
                                }}
                                placeholder="Ej. 104529"
                                className={`w-full px-2 py-1 rounded-lg border text-xs font-mono font-bold outline-hidden ${
                                  isMissingDropiId ? 'border-rose-400 bg-rose-50/50 focus:border-rose-600' : 'border-slate-300 bg-white focus:border-cyan-500'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDropiModalOrder(null)}
                    disabled={isApprovingDropi}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isApprovingDropi}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold shadow-md shadow-cyan-600/25 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isApprovingDropi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Transmitiendo a Dropi Colombia...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Aprobar y Enviar a Dropi Colombia</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA BORRAR TODAS LAS VENTAS */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">¿Borrar todos los pedidos?</h3>
                  <p className="text-xs text-slate-500">Esta acción reiniciará las ventas a $0</p>
                </div>
              </div>
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Se eliminarán permanentemente todos los <strong>{orders.length} pedidos registrados</strong> y se restablecerán a $0 las métricas de ventas. Tus productos del catálogo no serán afectados.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeClearSales}
                disabled={isClearing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Borrando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, Borrar Todo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configurable Sales Simulator Modal */}
      <SalesSimulatorModal
        isOpen={showSimulatorModal}
        onClose={() => setShowSimulatorModal(false)}
        products={products}
        onSimulationComplete={() => {
          onRefresh();
        }}
      />

    </div>
  );
};
