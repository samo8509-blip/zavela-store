import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  Banknote, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Search,
  ChevronDown,
  Info
} from 'lucide-react';
import { CartItem, CheckoutFormData, Order, ActiveDiscountCoupon } from '../types/index.ts';
import { COLOMBIA_DEPARTMENTS, getDaneCode } from '../data/colombiaGeo.ts';
import { calculateShippingCost, SHIPPING_ZONES, ShippingCalculationResult } from '../data/shippingRates.ts';
import { formatCOP } from '../utils/formatters.ts';
import { getCurrentCustomer } from '../utils/customerAuthManager.ts';
import { triggerEpaycoCheckout } from '../services/epaycoService.ts';
import { calculateCartTotals } from '../utils/comboPricing.ts';

// NOTA: Se eliminó la importación de decrementCpanelProductStock para proteger el catálogo.

export const cleanProductId = (rawId: string | number | undefined | null): string => {
  if (rawId === undefined || rawId === null) return '';
  return String(rawId).replace(/proc-/gi, '').replace(/^proc[-_]/i, '').trim();
};

export const compareProductIds = (
  idA: string | number | undefined | null,
  idB: string | number | undefined | null
): boolean => {
  if (!idA || !idB) return false;
  const cleanA = String(idA).replace('proc-', '').trim();
  const cleanB = String(idB).replace('proc-', '').trim();
  return cleanA === cleanB;
};

export const findStoreProductMatch = <T extends { id?: any; productId?: any; slug?: string }>(
  cartItemOrId: any,
  storeProducts: T[] = []
): T | undefined => {
  const rawTargetId = cartItemOrId?.productId || cartItemOrId?.product?.id || cartItemOrId?.id || cartItemOrId;
  const targetId = String(rawTargetId || '').replace('proc-', '').trim();
  const targetSlug = String(cartItemOrId?.product?.slug || cartItemOrId?.slug || '').trim().toLowerCase();

  if (!targetId && !targetSlug) return undefined;

  return storeProducts.find(p => {
    const rawPId = p.id || p.productId;
    const pCleanId = String(rawPId || '').replace('proc-', '').trim();
    const pCleanSlug = String(p.slug || '').trim().toLowerCase();

    if (targetId && pCleanId && targetId === pCleanId) return true;
    if (rawTargetId && rawPId && String(rawPId).trim() === String(rawTargetId).trim()) return true;
    if (targetSlug && pCleanSlug && pCleanSlug === targetSlug) return true;

    return false;
  });
};

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderCreated: (order: Order) => void;
  freeShippingThreshold?: number;
  appliedCoupon?: ActiveDiscountCoupon | null;
  onRemoveCoupon?: () => void;
  products?: any[];
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onOrderCreated,
  freeShippingThreshold = 120000,
  appliedCoupon,
  onRemoveCoupon,
  products = []
}) => {
  if (!isOpen) return null;

  const loggedCustomer = useMemo(() => getCurrentCustomer(), [isOpen]);

  const [formData, setFormData] = useState<CheckoutFormData>(() => {
    const cust = getCurrentCustomer();
    if (cust) {
      return {
        firstName: cust.firstName || (cust.name ? cust.name.split(' ')[0] : ''),
        lastName: cust.lastName || (cust.name ? cust.name.split(' ').slice(1).join(' ') : ''),
        phone: cust.phone || '',
        email: cust.email || '',
        department: cust.department || 'Bogotá D.C.',
        city: cust.city || 'Bogotá D.C.',
        address: cust.address || '',
        additionalNotes: '',
        paymentMethod: 'contra_entrega'
      };
    }
    return {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      department: 'Bogotá D.C.',
      city: 'Bogotá D.C.',
      address: '',
      additionalNotes: '',
      paymentMethod: 'contra_entrega'
    };
  });

  useEffect(() => {
    if (isOpen) {
      const cust = getCurrentCustomer();
      if (cust) {
        setFormData(prev => ({
          ...prev,
          firstName: prev.firstName || cust.firstName || (cust.name ? cust.name.split(' ')[0] : ''),
          lastName: prev.lastName || cust.lastName || (cust.name ? cust.name.split(' ').slice(1).join(' ') : ''),
          phone: prev.phone || cust.phone || '',
          email: prev.email || cust.email || '',
          department: prev.department && prev.department !== 'Bogotá D.C.' ? prev.department : (cust.department || 'Bogotá D.C.'),
          city: prev.city && prev.city !== 'Bogotá D.C.' ? prev.city : (cust.city || 'Bogotá D.C.'),
          address: prev.address || cust.address || ''
        }));
      }
    }
  }, [isOpen]);

  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const currentDepartmentInfo = useMemo(() => {
    return COLOMBIA_DEPARTMENTS.find(
      d => d.name.toLowerCase() === formData.department.toLowerCase()
    ) || COLOMBIA_DEPARTMENTS[0];
  }, [formData.department]);

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) {
      return currentDepartmentInfo.cities;
    }
    const query = citySearchQuery.toLowerCase().trim();
    return currentDepartmentInfo.cities.filter(c => c.toLowerCase().includes(query));
  }, [currentDepartmentInfo, citySearchQuery]);

  const handleDepartmentChange = (deptName: string) => {
    const dept = COLOMBIA_DEPARTMENTS.find(d => d.name === deptName);
    const defaultCity = dept && dept.cities.length > 0 ? dept.cities[0] : '';
    setFormData(prev => ({
      ...prev,
      department: deptName,
      city: defaultCity
    }));
    setCitySearchQuery('');
    setIsCityDropdownOpen(false);
  };

  const cartTotals = useMemo(() => {
    return calculateCartTotals(cartItems);
  }, [cartItems]);

  const regularSubtotal = cartTotals.regularSubtotal;
  const shippingSavings = cartTotals.shippingSavings;
  const subtotalAfterShippingRule = cartTotals.discountedSubtotal;
  const subtotal = subtotalAfterShippingRule;

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || !appliedCoupon.percentage) return 0;
    return Math.round((subtotalAfterShippingRule * appliedCoupon.percentage) / 100);
  }, [subtotalAfterShippingRule, appliedCoupon]);

  const discountedSubtotal = Math.max(0, subtotalAfterShippingRule - discountAmount);

  const totalItemQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cartItems]);

  const shippingCalculation: ShippingCalculationResult = useMemo(() => {
    return calculateShippingCost({
      department: formData.department,
      city: formData.city,
      cartItems,
      totalQuantity: totalItemQuantity,
      subtotal: discountedSubtotal,
      freeShippingThreshold
    });
  }, [formData.department, formData.city, cartItems, totalItemQuantity, discountedSubtotal, freeShippingThreshold]);

  const shippingCost = shippingCalculation.finalRate;
  const total = discountedSubtotal + shippingCost;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName?.trim()) errors.firstName = 'Ingresa tu nombre';
    if (!formData.lastName?.trim()) errors.lastName = 'Ingresa tu apellido';
    
    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 12) {
      errors.phone = 'Ingresa un número de celular válido (ej: 310 123 4567)';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+\$/.test(formData.email)) {
      errors.email = 'Ingresa un correo electrónico válido';
    }

    if (!formData.department) errors.department = 'Selecciona un departamento';
    if (!formData.city?.trim()) errors.city = 'Selecciona o ingresa la ciudad o municipio';
    if (!formData.address?.trim()) errors.address = 'Ingresa la dirección exacta (Calle/Carrera, número, apto)';

    for (const item of cartItems) {
      const rawId = item.product?.id || (item as any).productId || (item as any).id;
      const cleanId = String(rawId || '').replace('proc-', '').trim();
      if (!cleanId) {
        errors.products = `El producto "${item.product?.title || 'seleccionado'}" no tiene un identificador válido.`;
        break;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    if (cartItems.length === 0) {
      setServerError('El carrito está vacío. Agrega productos antes de continuar.');
      return;
    }

    const invalidItem = cartItems.find(item => {
      const rawCartId = item.product?.id || (item as any).productId || (item as any).id;
      if (!rawCartId) return true;
      const cleanCartId = String(rawCartId).replace('proc-', '').trim();
      if (!cleanCartId) return true;

      if (products && Array.isArray(products) && products.length > 0) {
        const exists = products.some(prod => {
          const rawProdId = prod.id || prod.productId;
          const cleanProdId = String(rawProdId || '').replace('proc-', '').trim();
          return (
            cleanCartId === cleanProdId ||
            String(rawProdId).trim() === String(rawCartId).trim() ||
            (prod.slug && item.product?.slug && String(prod.slug).trim().toLowerCase() === String(item.product.slug).trim().toLowerCase())
          );
        });
        return !exists;
      }

      return false;
    });

    if (invalidItem) {
      const rawDisplayId = invalidItem.product?.id || (invalidItem as any).productId || '';
      setServerError(`El producto "${invalidItem.product?.title || rawDisplayId}" no existe o no está disponible.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        firstName: formData.firstName?.trim(),
        lastName: formData.lastName?.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim(),
        department: formData.department,
        departamento: formData.department,
        city: formData.city.trim(),
        ciudad: formData.city.trim(),
        address: formData.address.trim(),
        direccion: formData.address.trim(),
        additionalNotes: formData.additionalNotes?.trim(),
        paymentMethod: formData.paymentMethod,
        dane_code: shippingCalculation.daneCode || getDaneCode(formData.city, formData.department),
        daneCode: shippingCalculation.daneCode || getDaneCode(formData.city, formData.department),
        codigo_dane: shippingCalculation.daneCode || getDaneCode(formData.city, formData.department),
        shippingCost: shippingCalculation.finalRate,
        shippingZone: shippingCalculation.zoneName,
        subtotal,
        discountCode: appliedCoupon?.code,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        discountPercent: appliedCoupon?.percentage,
        total,
        items: cartItems.map(item => {
          const originalId = item.product?.id || (item as any).productId || (item as any).id;
          return {
            id: originalId,
            productId: originalId,
            title: item.product?.title || (item as any).title || '',
            name: item.product?.title || (item as any).title || '',
            image: item.product?.images?.[0] || (item as any).image || '',
            images: item.product?.images || [],
            variantId: item.variant?.id,
            variantName: item.variant?.name,
            variantColor: item.variant?.color,
            variantSize: item.variant?.size || item.variant?.talla,
            dropi_variation_id: item.variant?.dropi_variation_id || item.variant?.dropiVariationId,
            dropi_product_id: item.product?.dropi_product_id || (item.product as any)?.dropiProductId || (item as any).dropi_product_id || '',
            sku: item.variant?.sku,
            quantity: item.quantity,
            unitPrice: item.variant?.price || item.product?.price || 0,
            comboInfo: item.comboInfo,
            comboGarmentLabel: item.comboGarmentLabel
          };
        })
      };

      // ENVÍO AL BACKEND (api.php maneja todo: registro de pedido y descuento de stock)
      const response = await fetch('/api/api.php?action=pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (!response.ok || (data.status !== 'ok' && !data.success)) {
        throw new Error(data.message || 'Error al procesar el pedido.');
      }

      // Si el pedido se registró bien, definimos la variable de la orden
      const createdOrder: Order = data.data || orderPayload;

      // FLUJO EPAYCO
      if (formData.paymentMethod === 'epayco' || formData.paymentMethod === 'pago_online') {
        const customerName = `${formData.firstName?.trim()} ${formData.lastName?.trim()}`.trim();
        const customerAddress = `${formData.address?.trim()}, ${formData.city?.trim()}`;
        const customerPhone = formData.phone.trim();

        try {
          await triggerEpaycoCheckout({
            orderId: createdOrder.orderNumber || createdOrder.id,
            orderReference: createdOrder.orderNumber || createdOrder.id,
            totalAmount: total,
            customerName,
            customerAddress,
            customerPhone,
            customerEmail: formData.email?.trim(),
            description: `Compra en Zavela Store - Pedido #${createdOrder.orderNumber || createdOrder.id}`
          });
        } catch (epaycoErr: any) {
          console.error('[ePayco Modal Error]:', epaycoErr);
          setServerError(`No se pudo abrir el checkout de ePayco: ${epaycoErr.message || 'Error desconocido'}`);
          setIsSubmitting(false);
          return;
        }

        onOrderCreated(createdOrder as any);
        onClose();
        return;
      }

      // FLUJO CONTRA ENTREGA
      if (data.whatsappAlert && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zavela_whatsapp_alert_triggered', {
          detail: {
            type: 'NEW_SALE',
            title: `Nueva Venta #${data.data?.orderNumber || ''}`,
            ...data.whatsappAlert,
            order: createdOrder
          }
        }));
      }

      onOrderCreated(createdOrder as any);
      onClose();
    } catch (err: any) {
      setServerError(err.message || 'Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="checkout-modal-backdrop" 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="checkout-modal-dialog" 
        className="bg-white text-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/30">
                🇨🇴 ZAVELA CHECKOUT SEGURO
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                • Cobertura en 32 Departamentos
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight mt-1">
              Finaliza tu pedido contra entrega
            </h2>
          </div>
          <button
            id="btn-close-checkout"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            title="Cerrar formulario de compra"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-2.5 bg-slate-100 border-b border-slate-200">
          <div className="flex items-center justify-between gap-2 text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
              <span className="truncate">
                ¡Felicidades! Tu compra incluye <strong>ENVÍO GRATIS NACIONAL (\$0 COP)</strong> a {formData.city ? `${formData.city}, ${formData.department}` : 'toda Colombia'}
              </span>
            </div>
            <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-2xs shrink-0">
              \$0 Flete
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6 bg-white">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="space-y-3">
            {loggedCustomer && (
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between animate-fadeIn shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-sky-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                    {(loggedCustomer.firstName || loggedCustomer.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold">Hola, {loggedCustomer.name}</span>
                    <p className="text-[11px] text-sky-700">Tus datos y dirección de envío se han cargado automáticamente.</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-white text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
                  ✓ Sesión Activa
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <User className="w-4 h-4 text-sky-600" />
              <span>1. Información del Destinatario</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre *</label>
                <input
                  id="input-first-name"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Ej: Carlos"
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 text-slate-900 border ${
                    formErrors.firstName ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'
                  } outline-hidden focus:ring-2 focus:ring-sky-500/20`}
                />
                {formErrors.firstName && <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.firstName}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Apellidos *</label>
                <input
                  id="input-last-name"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Ej: Montoya Restrepo"
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 text-slate-900 border ${
                    formErrors.lastName ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'
                  } outline-hidden focus:ring-2 focus:ring-sky-500/20`}
                />
                {formErrors.lastName && <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.lastName}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celular / WhatsApp (Para confirmar entrega y guía) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">🇨🇴 +57</span>
                  <input
                    id="input-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="310 123 4567"
                    className={`w-full pl-16 pr-3 py-2 text-xs rounded-xl bg-slate-50 text-slate-900 border ${
                      formErrors.phone ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'
                    } outline-hidden focus:ring-2 focus:ring-sky-500/20`}
                  />
                </div>
                {formErrors.phone && <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.phone}</span>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico (Para recibir la guía de rastreo)
                </label>
                <input
                  id="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tu.correo@ejemplo.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 text-slate-900 border ${
                    formErrors.email ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'
                  } outline-hidden focus:ring-2 focus:ring-sky-500/20`}
                />
                {formErrors.email && <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.email}</span>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>2. Destino y Cálculo de Envío en Colombia</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono font-bold">
                Tarifas 100% Automáticas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Departamento de Colombia *
                </label>
                <div className="relative">
                  <select
                    id="select-department"
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-500 outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer appearance-none shadow-2xs"
                  >
                    {COLOMBIA_DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.name} className="bg-white text-slate-900">
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {formErrors.department && <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.department}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Ciudad o Municipio ({formData.department}) *
                </label>
                <div className="relative">
                  <select
                    id="select-city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:border-sky-500 outline-hidden focus:ring-2 focus:ring-sky-500/20 cursor-pointer appearance-none shadow-2xs"
                  >
                    {currentDepartmentInfo.cities.map((city) => (
                      <option key={city} value={city} className="bg-white text-slate-900">
                        {city}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {formErrors.city && <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.city}</span>}
              </div>

              <div className="sm:col-span-2">
                <div className={`p-4 rounded-2xl border transition-all ${
                  shippingCalculation.isFreeShipping
                    ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-300 shadow-xs'
                    : shippingCalculation.zoneId === 'zona_1'
                    ? 'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-300 shadow-xs'
                    : shippingCalculation.zoneId === 'zona_2'
                    ? 'bg-gradient-to-r from-indigo-50 to-slate-50 border-indigo-200 shadow-xs'
                    : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-xs'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        shippingCalculation.isFreeShipping
                          ? 'bg-emerald-600 text-white'
                          : shippingCalculation.zoneId === 'zona_1'
                          ? 'bg-sky-600 text-white'
                          : shippingCalculation.zoneId === 'zona_2'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}>
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">
                            {shippingCalculation.zoneName}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                            shippingCalculation.isFreeShipping
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : shippingCalculation.zoneId === 'zona_1'
                              ? 'bg-sky-100 text-sky-800 border-sky-300'
                              : shippingCalculation.zoneId === 'zona_2'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {shippingCalculation.badgeText}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Destino: <strong>{formData.city}</strong> ({formData.department}) • Código DANE: <code className="font-mono text-slate-700 font-bold">{shippingCalculation.daneCode}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Entrega: {shippingCalculation.estimatedDays}</span>
                      </div>
                      <div className="text-xs font-black">
                        {shippingCalculation.isFreeShipping ? (
                          <span className="text-emerald-700 font-mono text-sm">GRATIS (\$0)</span>
                        ) : (
                          <span className="text-slate-900 font-mono text-sm">{formatCOP(shippingCalculation.finalRate)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {totalItemQuantity >= 2 && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 border-2 border-emerald-500/30 text-slate-900 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      🎉
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5 flex-wrap">
                        <span>¡Envío único aplicado por compras de 2 o más unidades!</span>
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                          {totalItemQuantity} unidades
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-800 font-medium leading-tight mt-0.5">
                        El valor del envío se cubre una sola vez para todo el paquete con despacho prioritario.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Dirección Exacta (Calle, Carrera, Manzana, Número de Casa/Edificio, Apto) *
                </label>
                <input
                  id="input-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej: Calle 45 # 12 - 34, Torre 2, Apto 501"
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-slate-50 text-slate-900 border ${
                    formErrors.address ? 'border-rose-500 bg-rose-50' : 'border-slate-300 focus:border-sky-500'
                  } outline-hidden focus:ring-2 focus:ring-sky-500/20`}
                />
                {formErrors.address && <span className="text-[11px] text-rose-600 mt-0.5 block">{formErrors.address}</span>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Barrio o Indicaciones Adicionales para el Domiciliario (Opcional)
                </label>
                <input
                  id="input-notes"
                  type="text"
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  placeholder="Ej: Barrio El Poblado, casa blanca reja negra, dejar en portería si no estoy."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 text-slate-900 border border-slate-300 focus:border-sky-500 outline-hidden focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <Banknote className="w-4 h-4 text-sky-600" />
              <span>3. Método de Pago</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  formData.paymentMethod === 'contra_entrega'
                    ? 'border-[#FF5A36] bg-orange-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="contra_entrega"
                  checked={formData.paymentMethod === 'contra_entrega'}
                  onChange={() => setFormData({ ...formData, paymentMethod: 'contra_entrega' })}
                  className="mt-0.5 accent-[#FF5A36]"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                    <span>Pago Contra Entrega (Efectivo al Recibir)</span>
                    <span className="bg-gradient-to-r from-[#FF5A36] to-[#FF3366] text-white text-[10px] px-1.5 py-0.2 rounded-md uppercase font-extrabold shadow-xs">Popular</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Pagas en efectivo al domiciliario de Servientrega, Coordinadora o Interrapidísimo al recibir tu paquete en casa.
                  </p>
                </div>
              </label>

              <label 
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  formData.paymentMethod === 'epayco' || formData.paymentMethod === 'pago_online'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="epayco"
                  checked={formData.paymentMethod === 'epayco' || formData.paymentMethod === 'pago_online'}
                  onChange={() => setFormData({ ...formData, paymentMethod: 'epayco' })}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Pago en Línea Seguro con ePayco</span>
                    <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-md uppercase font-extrabold shadow-xs">Seguro</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    (PSE, Tarjetas de Crédito/Débito, Daviplata, Nequi, Efecty). Pasarela certificada PCI-DSS y despacho prioritario.
                  </p>
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[9px] font-bold bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">PSE</span>
                    <span className="text-[9px] font-bold bg-white text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">Tarjetas</span>
                    <span className="text-[9px] font-bold bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">Nequi</span>
                    <span className="text-[9px] font-bold bg-white text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">Daviplata</span>
                    <span className="text-[9px] font-bold bg-white text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Efecty</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>Resumen de Compra ({cartItems.length} {cartItems.length === 1 ? 'ítem' : 'ítems'})</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500 font-mono">
                {formData.city}, {formData.department}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-600">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="truncate max-w-[240px] text-slate-800">
                    {item.quantity}x {item.product.title} {item.variant && `(${item.variant.name})`}
                  </span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatCOP((item.variant?.price || item.product.price) * item.quantity)}
                  </span>
                </div>
              ))}

              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="font-medium text-slate-700">Subtotal Productos:</span>
                <span className="font-mono font-bold text-slate-900">{formatCOP(regularSubtotal)}</span>
              </div>

              {shippingSavings > 0 && (
                <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs">🚚</span>
                    <span className="font-extrabold text-xs text-emerald-800 truncate">
                      Ahorro Envío Único (Combos):
                    </span>
                  </div>
                  <span className="font-mono font-black text-xs text-emerald-700">
                    -{formatCOP(shippingSavings)}
                  </span>
                </div>
              )}

              {appliedCoupon && discountAmount > 0 && (
                <div className="flex justify-between items-center py-1.5 bg-emerald-50 px-2.5 rounded-xl border border-emerald-300 text-emerald-900">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs">🎁</span>
                    <span className="font-extrabold text-xs text-emerald-800 truncate">
                      Descuento Ruleta ({appliedCoupon.code} -{appliedCoupon.percentage}%):
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-black text-xs text-emerald-700">
                      -{formatCOP(discountAmount)}
                    </span>
                    {onRemoveCoupon && (
                      <button
                        type="button"
                        onClick={onRemoveCoupon}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold underline cursor-pointer"
                        title="Quitar cupón"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center py-1.5 bg-white px-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-slate-800">Costo de Envío ({shippingCalculation.zoneShortName}):</span>
                  {totalItemQuantity >= 2 && (
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      🎉 Envío Único ({totalItemQuantity} un.)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {shippingCalculation.baseRate > 0 && (
                    <span className="text-slate-400 line-through text-[11px] font-mono">
                      {formatCOP(shippingCalculation.baseRate)}
                    </span>
                  )}
                  <span className="font-black text-xs text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                    ¡GRATIS! (\$0 COP)
                  </span>
                </div>
              </div>

              <div className="border-t-2 border-slate-300 pt-2.5 flex justify-between items-center text-sm font-black text-slate-950">
                <span>Total a Pagar en Destino:</span>
                <div className="text-right">
                  <span className="text-lg font-mono text-slate-950 font-black">{formatCOP(total)}</span>
                  <span className="block text-[10px] text-slate-500 font-normal">
                    {formData.paymentMethod === 'contra_entrega' ? 'Pagas en efectivo al recibir' : 'Pago verificado'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-submit-order"
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white font-black py-4 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-98 ${
                formData.paymentMethod === 'epayco' || formData.paymentMethod === 'pago_online'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800'
                  : 'bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>
                    {formData.paymentMethod === 'epayco' || formData.paymentMethod === 'pago_online'
                      ? 'Abriendo pasarela segura ePayco Colombia...'
                      : 'Registrando pedido y generando guía...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>
                    {formData.paymentMethod === 'epayco' || formData.paymentMethod === 'pago_online'
                      ? `PAGAR EN LÍNEA CON EPAYCO (${formatCOP(total)})`
                      : `CONFIRMAR PEDIDO CONTRA ENTREGA (${formatCOP(total)})`}
                  </span>
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mt-2 font-medium text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garantía de compra protegida Zavela Store • Despacho verificado para {formData.city}, {formData.department}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};