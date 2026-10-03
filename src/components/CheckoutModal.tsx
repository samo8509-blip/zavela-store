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
import { decrementFirestoreProductStock } from '../services/firestoreProducts.ts';
import { getCurrentCustomer } from '../utils/customerAuthManager.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderCreated: (order: Order) => void;
  freeShippingThreshold?: number;
  appliedCoupon?: ActiveDiscountCoupon | null;
  onRemoveCoupon?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onOrderCreated,
  freeShippingThreshold = 120000,
  appliedCoupon,
  onRemoveCoupon
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

  // Department / City data
  const currentDepartmentInfo = useMemo(() => {
    return COLOMBIA_DEPARTMENTS.find(
      d => d.name.toLowerCase() === formData.department.toLowerCase()
    ) || COLOMBIA_DEPARTMENTS[0];
  }, [formData.department]);

  // Filtered cities list based on search
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) {
      return currentDepartmentInfo.cities;
    }
    const query = citySearchQuery.toLowerCase().trim();
    return currentDepartmentInfo.cities.filter(c => c.toLowerCase().includes(query));
  }, [currentDepartmentInfo, citySearchQuery]);

  // Handle department change with linked city reset
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

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.product.price;
      return sum + price * item.quantity;
    }, 0);
  }, [cartItems]);

  // Discount calculation
  const discountAmount = useMemo(() => {
    if (!appliedCoupon || !appliedCoupon.percentage) return 0;
    return Math.round((subtotal * appliedCoupon.percentage) / 100);
  }, [subtotal, appliedCoupon]);

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  // Dynamic 3-Zone Shipping calculation
  const shippingCalculation: ShippingCalculationResult = useMemo(() => {
    return calculateShippingCost({
      department: formData.department,
      city: formData.city,
      cartItems,
      subtotal: discountedSubtotal,
      freeShippingThreshold
    });
  }, [formData.department, formData.city, cartItems, discountedSubtotal, freeShippingThreshold]);

  const shippingCost = shippingCalculation.finalRate;
  const total = discountedSubtotal + shippingCost;

  // Validation function
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName?.trim()) errors.firstName = 'Ingresa tu nombre';
    if (!formData.lastName?.trim()) errors.lastName = 'Ingresa tu apellido';
    
    // Colombian phone validation (10 digits starting with 3 or landline)
    const cleanPhone = (formData.phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7 || cleanPhone.length > 12) {
      errors.phone = 'Ingresa un número de celular válido (ej: 310 123 4567)';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Ingresa un correo electrónico válido';
    }

    if (!formData.department) errors.department = 'Selecciona un departamento';
    if (!formData.city?.trim()) errors.city = 'Selecciona o ingresa la ciudad o municipio';
    if (!formData.address?.trim()) errors.address = 'Ingresa la dirección exacta (Calle/Carrera, número, apto)';

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

    setIsSubmitting(true);

    try {
      const orderPayload = {
        firstName: formData.firstName?.trim(),
        lastName: formData.lastName?.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim(),
        department: formData.department,
        city: formData.city.trim(),
        address: formData.address.trim(),
        additionalNotes: formData.additionalNotes?.trim(),
        paymentMethod: formData.paymentMethod,
        dane_code: shippingCalculation.daneCode,
        shippingCost: shippingCalculation.finalRate,
        shippingZone: shippingCalculation.zoneName,
        subtotal,
        discountCode: appliedCoupon?.code,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
        discountPercent: appliedCoupon?.percentage,
        total,
        items: cartItems.map(item => ({
          productId: item.product.id,
          variantId: item.variant?.id,
          quantity: item.quantity,
          unitPrice: item.variant?.price || item.product.price
        }))
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Error al procesar el pedido.');
      }

      // Descontar inventario atómicamente en Cloud Firestore en tiempo real
      try {
        await decrementFirestoreProductStock(
          cartItems.map(item => ({
            productId: item.product.id,
            variantId: item.variant?.id,
            quantity: item.quantity
          }))
        );
      } catch (stockErr) {
        console.warn('Advertencia al sincronizar deducción de inventario en Firestore:', stockErr);
      }

      // Notificar al sistema de alertas de WhatsApp en frontend
      if (data.whatsappAlert && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('zavela_whatsapp_alert_triggered', {
          detail: {
            type: 'NEW_SALE',
            title: `Nueva Venta #${data.data?.orderNumber || ''}`,
            ...data.whatsappAlert,
            order: data.data
          }
        }));
      }

      onOrderCreated(data.data);
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
        {/* Header */}
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

        {/* Free Shipping Notification Banner / Progress Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100 border-b border-slate-200">
          {shippingCalculation.isFreeShipping ? (
            <div className="flex items-center justify-between gap-2 text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                <span>¡Felicidades! Calificas para <strong>ENVÍO 100% GRATIS</strong> a {formData.city}, {formData.department}</span>
              </div>
              <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shadow-2xs">
                ¡Ahorras {formatCOP(shippingCalculation.baseRate)}!
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-medium">
                  🚚 <strong>1 producto tiene flete ({formatCOP(shippingCalculation.baseRate)})</strong>. ¡Lleva <strong>2 productos o más</strong> y tu envío es <strong>TOTALMENTE GRATIS</strong>!
                </span>
                <span className="font-bold text-emerald-700 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                  2+ prods = $0 Flete
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round(Math.max((subtotal / freeShippingThreshold) * 100, (cartItems.reduce((s, i) => s + i.quantity, 0) / 2) * 100)))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6 bg-white">
          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Section 1: Personal Information */}
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

          {/* Section 2: Linked Shipping Selectors (Department & City) + Dynamic Zone Rate */}
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
              {/* Linked Selector A: Department */}
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

              {/* Linked Selector B: City / Municipality (Filtered dynamically) */}
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

              {/* Dynamic Shipping Zone Card */}
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
                          <span className="text-emerald-700 font-mono text-sm">GRATIS ($0)</span>
                        ) : (
                          <span className="text-slate-900 font-mono text-sm">{formatCOP(shippingCalculation.finalRate)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exact Address */}
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

              {/* Notes */}
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

          {/* Section 3: Payment Method */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-200 pb-1.5">
              <Banknote className="w-4 h-4 text-sky-600" />
              <span>3. Método de Pago</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash On Delivery Option */}
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
                    <span>PAGO CONTRA ENTREGA</span>
                    <span className="bg-gradient-to-r from-[#FF5A36] to-[#FF3366] text-white text-[10px] px-1.5 py-0.2 rounded-md uppercase font-extrabold shadow-xs">Popular</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Pagas en efectivo al domiciliario de Servientrega, Coordinadora o Interrapidísimo al recibir tu paquete.
                  </p>
                </div>
              </label>

              {/* Online Payment Option */}
              <label 
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  formData.paymentMethod === 'pago_online'
                    ? 'border-sky-600 bg-sky-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="pago_online"
                  checked={formData.paymentMethod === 'pago_online'}
                  onChange={() => setFormData({ ...formData, paymentMethod: 'pago_online' })}
                  className="mt-0.5 accent-sky-600"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                    <span>Pago en Línea Seguro</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Tarjetas Débito/Crédito, PSE, Nequi o Daviplata. Despacho prioritario directo.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Dynamic Order Summary Breakdown */}
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
                <span className="font-mono font-bold text-slate-900">{formatCOP(subtotal)}</span>
              </div>

              {/* Applied Ruleta Discount Line */}
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

              {/* Dynamic Shipping Breakdown Line */}
              <div className="flex justify-between items-center py-1 bg-white px-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-slate-800">Costo de Envío ({shippingCalculation.zoneShortName}):</span>
                </div>
                <div>
                  {shippingCalculation.isFreeShipping ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 line-through text-[11px] font-mono">
                        {formatCOP(shippingCalculation.baseRate)}
                      </span>
                      <span className="font-extrabold text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        ¡GRATIS!
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-slate-900">
                      {formatCOP(shippingCalculation.finalRate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Total Row */}
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-submit-order"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] disabled:opacity-50 active:scale-98 text-white font-black py-4 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Registrando pedido y generando guía...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>CONFIRMAR PEDIDO ({formatCOP(total)})</span>
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
