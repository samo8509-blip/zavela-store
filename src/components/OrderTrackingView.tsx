import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Truck, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  PhoneCall, 
  MapPin, 
  ArrowLeft,
  Loader2,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Info,
  DollarSign
} from 'lucide-react';
import { formatCOP } from '../utils/formatters.ts';
import { getCustomerOrders } from '../utils/customerOrdersManager.ts';
import { 
  CarrierShipment, 
  COLOMBIAN_TEST_GUIDES, 
  COLOMBIAN_CARRIERS_META, 
  findShipmentByQuery,
  ColombianCarrierName
} from '../utils/colombianCarriers.ts';
import { CarrierLogoBadge } from './CarrierLogoBadge.tsx';

interface OrderTrackingViewProps {
  initialQuery?: string;
  whatsappNumber?: string;
  onBackToStore: () => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  initialQuery = '',
  whatsappNumber,
  onBackToStore
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery || 'INT-240091842019');
  const [activeShipment, setActiveShipment] = useState<CarrierShipment | null>(COLOMBIAN_TEST_GUIDES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const rawPhone = whatsappNumber || '573157894512';
  let cleanPhone = rawPhone.replace(/[^\d]/g, '');
  if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
    cleanPhone = `57${cleanPhone}`;
  }
  if (!cleanPhone) cleanPhone = '573157894512';

  const handleSearch = async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMessage(null);

    // 1. Search in Colombian test guides (exact or numeric match)
    const foundSample = findShipmentByQuery(q);
    if (foundSample) {
      setActiveShipment(foundSample);
      setIsLoading(false);
      return;
    }

    // 2. Check customer orders recorded in portal (from recent purchases)
    const customerOrders = getCustomerOrders();
    const cleanQ = q.toUpperCase().replace(/\s+/g, '');
    const foundCustomerOrder = customerOrders.find(
      o => o.orderNumber.toUpperCase() === cleanQ || 
           (o.trackingNumber && o.trackingNumber.toUpperCase() === cleanQ)
    );

    if (foundCustomerOrder) {
      let step = 1;
      let statusTxt = 'En preparación en bodega';
      if (foundCustomerOrder.status === 'enviado') {
        step = 3;
        statusTxt = 'En ruta de entrega con transportadora';
      }
      if (foundCustomerOrder.status === 'entregado') {
        step = 4;
        statusTxt = 'Entregado a satisfacción';
      }

      const carrierName: ColombianCarrierName = 
        foundCustomerOrder.carrier?.toLowerCase().includes('servi') ? 'Servientrega' :
        foundCustomerOrder.carrier?.toLowerCase().includes('coord') ? 'Coordinadora' :
        foundCustomerOrder.carrier?.toLowerCase().includes('inter') ? 'Inter Rapidísimo' : 'Envía';

      setActiveShipment({
        orderNumber: foundCustomerOrder.orderNumber,
        trackingNumber: foundCustomerOrder.trackingNumber || `ZV-${foundCustomerOrder.orderNumber}`,
        carrier: carrierName,
        originCity: 'Bogotá D.C. (Bodega Central Zavela)',
        originHub: 'Centro Logístico Principal',
        destinationCity: foundCustomerOrder.customerCity || 'Colombia',
        destinationAddress: foundCustomerOrder.customerAddress || 'Dirección registrada',
        estimatedDelivery: step === 4 ? 'Entregado a satisfacción' : '2 a 3 días hábiles',
        statusStep: step,
        statusTitle: statusTxt,
        statusDetails: `Despacho asignado a ${carrierName} bajo la modalidad de Pago Contra Entrega.`,
        paymentMode: 'contra_entrega',
        paymentModeLabel: foundCustomerOrder.paymentMethod || 'Pago Contra Entrega en Efectivo',
        totalCOP: foundCustomerOrder.total,
        productTitle: foundCustomerOrder.items[0]?.title || 'Pedido Oficial Zavela Store',
        productImage: foundCustomerOrder.items[0]?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        carrierGuideFormat: COLOMBIAN_CARRIERS_META[carrierName].guideFormatDescription,
        checkpoints: [
          {
            id: 'cp-user-1',
            date: 'Hoy',
            time: 'Reciente',
            location: 'Centro de Distribución',
            city: foundCustomerOrder.customerCity || 'Colombia',
            status: statusTxt,
            description: `Seguimiento activo en la red logística de ${carrierName}. Recuerda tener listo el efectivo al momento de la entrega.`,
            isCompleted: true,
            isCurrent: true
          }
        ]
      });
      setIsLoading(false);
      return;
    }

    // 3. Fallback: Query backend API
    try {
      const response = await fetch(`/api/orders/track/${encodeURIComponent(q)}`);
      const data = await response.json();

      if (response.ok && data.success && data.data.length > 0) {
        const o = data.data[0];
        let step = 0;
        if (o.status === 'procesando') step = 1;
        if (o.status === 'enviado') step = 2;
        if (o.status === 'entregado') step = 4;

        const carrierName: ColombianCarrierName = 
          (o.carrier || '').toLowerCase().includes('coord') ? 'Coordinadora' :
          (o.carrier || '').toLowerCase().includes('inter') ? 'Inter Rapidísimo' :
          (o.carrier || '').toLowerCase().includes('env') ? 'Envía' : 'Servientrega';

        setActiveShipment({
          orderNumber: o.orderNumber,
          trackingNumber: o.trackingNumber || `GUIA-${o.orderNumber}`,
          carrier: carrierName,
          originCity: 'Bodega Principal Zavela Store',
          originHub: 'Centro Logístico Cundinamarca',
          destinationCity: o.shippingAddress?.city || 'Colombia',
          destinationAddress: o.shippingAddress?.addressLine1 || 'Dirección de envío',
          estimatedDelivery: step === 4 ? 'Entregado a satisfacción' : 'En proceso de entrega',
          statusStep: step,
          statusTitle: 'Envío registrado en plataforma',
          statusDetails: 'Despacho registrado en el sistema oficial de Zavela Store con transportadora nacional aliada.',
          paymentMode: 'contra_entrega',
          paymentModeLabel: 'Pago Contra Entrega en Efectivo',
          totalCOP: o.total,
          productTitle: o.items?.[0]?.productTitle || 'Pedido Zavela',
          productImage: o.items?.[0]?.productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
          carrierGuideFormat: COLOMBIAN_CARRIERS_META[carrierName].guideFormatDescription,
          checkpoints: [
            {
              id: 'cp-api-1',
              date: 'Hoy',
              time: 'En tránsito',
              location: 'Plataforma Logística Nacional',
              city: o.shippingAddress?.city || 'Colombia',
              status: 'En Proceso de Despacho',
              description: `Envío gestionado a través de ${carrierName}.`,
              isCompleted: true,
              isCurrent: true
            }
          ]
        });
      } else {
        setErrorMessage(`No se encontró ningún paquete con la guía o pedido "${queryToSearch}". Te sugerimos probar con uno de los 4 botones de ejemplo directo de Servientrega, Coordinadora, Inter Rapidísimo o Envía.`);
      }
    } catch {
      setErrorMessage(`No fue posible consultar el servidor en este momento. Puedes probar con las guías de demostración activas.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // 5 Pasos de la Línea de Tiempo requeridos:
  // 'Pedido confirmado' -> 'En preparación' -> 'Despachado con transportadora (ej. Envía/Servientrega/Inter Rapidísimo)' -> 'En ruta de entrega' -> 'Entregado'
  const steps = [
    { title: 'Pedido Confirmado', desc: 'Verificado y registrado en bodega Zavela' },
    { title: 'En Preparación', desc: 'Control de calidad, precinto y generación de etiqueta' },
    { 
      title: activeShipment ? `Despachado (${activeShipment.carrier})` : 'Despachado con Transportadora', 
      desc: 'En tránsito terrestre en centro de distribución' 
    },
    { title: 'En Ruta de Entrega', desc: 'El mensajero se dirige a tu dirección con el paquete' },
    { title: 'Entregado', desc: 'Recibido a satisfacción y recaudo confirmado' }
  ];

  const handleCopyGuide = () => {
    if (!activeShipment) return;
    navigator.clipboard.writeText(activeShipment.trackingNumber);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSelectSample = (sample: CarrierShipment) => {
    setSearchQuery(sample.trackingNumber);
    setActiveShipment(sample);
    setErrorMessage(null);
  };

  return (
    <div id="order-tracking-view" className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      
      {/* Top Bar Navigation & Carrier Assurance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          id="btn-back-to-store-tracking"
          onClick={onBackToStore}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-sky-400 px-4 py-2.5 rounded-2xl transition-all cursor-pointer shadow-xs active:scale-98 w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-sky-600" />
          <span>Volver al Catálogo</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs text-xs font-mono text-slate-600">
          <Truck className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Transportadoras Oficiales: <strong>Servientrega • Coordinadora • Inter Rapidísimo • Envía</strong></span>
        </div>
      </div>

      {/* Main Hero Search Card with Colombian Carrier Buttons */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0A1128] to-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 text-white border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Decorative Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>SISTEMA DE RASTREO CON TRANSPORTADORAS DE COLOMBIA</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
            Seguimiento de Envíos en Tiempo Real
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Consulta el estado de tu despacho nacional con <strong className="text-white">Inter Rapidísimo, Servientrega, Coordinadora o Envía</strong>. Ingresa tu número de guía o número de pedido (ej: ZAV-1002) y verifica el recaudo de <strong>Pago Contra Entrega</strong>.
          </p>
        </div>

        {/* Search Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchQuery);
          }} 
          className="relative z-10 flex flex-col sm:flex-row gap-2 max-w-2xl"
        >
          <div className="relative flex-1">
            <input
              id="tracking-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ingresa guía (ej: INT-240091842019, 2198402941) o pedido..."
              className="w-full pl-11 pr-4 py-3.5 bg-slate-900/90 text-white placeholder:text-slate-400 rounded-2xl border border-slate-700 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-hidden text-xs sm:text-sm font-mono transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-sky-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          <button
            id="btn-search-tracking"
            type="submit"
            disabled={isLoading}
            className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:scale-98 disabled:opacity-50 text-white font-black px-6 py-3.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer shrink-0 uppercase tracking-wider"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4 text-white" />}
            <span>Rastrear Envío</span>
          </button>
        </form>

        {/* 4 FAST TEST GUIDE BUTTONS (Exact Requirement) */}
        <div className="relative z-10 pt-5 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Guías Simuladas de Prueba Rápida (1 Clic):</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Selecciona una transportadora para ver su estado específico
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Inter Rapidísimo Button */}
            <button
              type="button"
              onClick={() => handleSelectSample(COLOMBIAN_TEST_GUIDES[0])}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                activeShipment?.carrier === 'Inter Rapidísimo'
                  ? 'bg-orange-950/60 border-orange-500 ring-2 ring-orange-500/30 text-white shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300 hover:border-orange-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-orange-400 font-sans uppercase">
                  ⚡ Inter Rapidísimo
                </span>
                <span className="text-[9px] font-mono font-bold bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">
                  Paso 4: En Ruta
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-white block">
                INT-240091842019
              </span>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                En ruta de entrega con recaudo pendiente.
              </p>
            </button>

            {/* 2. Servientrega Button */}
            <button
              type="button"
              onClick={() => handleSelectSample(COLOMBIAN_TEST_GUIDES[1])}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                activeShipment?.carrier === 'Servientrega'
                  ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-white shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-emerald-400 font-sans uppercase">
                  📦 Servientrega
                </span>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                  Paso 3: Tránsito
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-white block">
                SER-2198402941
              </span>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                En tránsito en centro de distribución principal.
              </p>
            </button>

            {/* 3. Coordinadora Button */}
            <button
              type="button"
              onClick={() => handleSelectSample(COLOMBIAN_TEST_GUIDES[2])}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                activeShipment?.carrier === 'Coordinadora'
                  ? 'bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30 text-white shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300 hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-blue-400 font-sans uppercase">
                  💎 Coordinadora
                </span>
                <span className="text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                  Paso 5: Entregado
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-white block">
                COO-74920194821
              </span>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                Entregado con éxito a satisfacción del cliente.
              </p>
            </button>

            {/* 4. Envía Button */}
            <button
              type="button"
              onClick={() => handleSelectSample(COLOMBIAN_TEST_GUIDES[3])}
              className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                activeShipment?.carrier === 'Envía'
                  ? 'bg-red-950/60 border-[#FF5900] ring-2 ring-[#FF5900]/30 text-white shadow-md'
                  : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300 hover:border-[#FF5900]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-[#FF7A33] font-sans uppercase">
                  🚚 Envía Colvanes
                </span>
                <span className="text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                  Paso 2: En Bodega
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-white block">
                ENV-0492817402
              </span>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                En preparación en bodega / Generación etiqueta.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm">No pudimos localizar la guía solicitada</p>
            <p className="text-slate-600">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ACTIVE SHIPMENT COMPREHENSIVE CARD */}
      {activeShipment && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8 animate-fadeIn text-slate-800">
          
          {/* Header Bar: Carrier Logo Badge, Guide Number & Delivery Estimate */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
            {/* Carrier Identity */}
            <div>
              <CarrierLogoBadge carrier={activeShipment.carrier} size="lg" showTagline={true} />
              
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-mono">Guía:</span>
                  <strong className="text-sm font-black font-mono text-slate-900 tracking-wide">
                    {activeShipment.trackingNumber}
                  </strong>
                  
                  <button
                    type="button"
                    onClick={handleCopyGuide}
                    className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors ml-1 cursor-pointer"
                    title="Copiar número de guía"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isCopied && (
                  <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-fadeIn">
                    ¡Guía Copiada!
                  </span>
                )}

                <span className="text-xs font-mono text-slate-500">
                  Pedido: <strong className="text-slate-900">#{activeShipment.orderNumber}</strong>
                </span>
                
                <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  {activeShipment.carrierGuideFormat}
                </span>
              </div>
            </div>

            {/* Estimated Delivery Status Box */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block">
                  Promesa de Entrega:
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-950 font-sans">
                  {activeShipment.estimatedDelivery}
                </span>
                <span className="text-[10px] text-emerald-700 block font-medium">
                  {activeShipment.statusTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Route Connection: Origin City -> Destination City */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
              
              {/* Origin */}
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Ciudad de Origen
                </span>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    {activeShipment.originCity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {activeShipment.originHub}
                </p>
              </div>

              {/* Transit Indicator */}
              <div className="flex flex-col items-center justify-center py-2 md:py-0 border-y md:border-y-0 md:border-x border-slate-200 px-2 text-center">
                <div className="flex items-center gap-2 text-sky-600 font-bold text-xs font-mono mb-1">
                  <span>En Tránsito Nacional</span>
                  <ArrowRight className="w-4 h-4 animate-pulse" />
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden max-w-[180px]">
                  <div 
                    className="bg-sky-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(20, (activeShipment.statusStep + 1) * 20))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1">
                  Operado por {activeShipment.carrier}
                </span>
              </div>

              {/* Destination */}
              <div className="space-y-0.5 text-left md:text-right">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Ciudad de Destino
                </span>
                <div className="flex items-center md:justify-end gap-2">
                  <span className="text-xs sm:text-sm font-black text-emerald-800">
                    {activeShipment.destinationCity}
                  </span>
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500 font-mono">
                  {activeShipment.destinationAddress}
                </p>
              </div>

            </div>
          </div>

          {/* Payment & Collection Mode Highlight Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Modalidad de Cobro */}
            <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 block">
                  Modalidad de Cobro
                </span>
                <h4 className="text-xs sm:text-sm font-black text-amber-950">
                  {activeShipment.paymentModeLabel}
                </h4>
                <p className="text-[11px] text-amber-900 leading-snug">
                  {activeShipment.paymentMode === 'contra_entrega'
                    ? 'Pagas al mensajero únicamente al recibir el paquete en la puerta de tu casa. Acepta efectivo o transferencia QR.'
                    : 'Pedido pagado en su totalidad antes del despacho. No debes pagar ningún valor adicional al recibir.'}
                </p>
              </div>
            </div>

            {/* Total a Recaudar / Pagar */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  Valor Total a Pagar al Repartidor:
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                  {formatCOP(activeShipment.totalCOP)}
                </div>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Sin cobros ocultos ni costos sorpresa
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono font-bold bg-white text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 block shadow-2xs">
                  Flete Nacional Incluido
                </span>
              </div>
            </div>

          </div>

          {/* 5-Step Graphical Timeline (Exact 5 States) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Línea de Tiempo del Despacho (5 Fases Oficiales):</span>
              </h3>
              <span className="text-xs font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                Fase {activeShipment.statusStep + 1} de 5: {steps[activeShipment.statusStep].title}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 relative">
              {steps.map((step, idx) => {
                const isCompleted = idx <= activeShipment.statusStep;
                const isCurrent = idx === activeShipment.statusStep;

                return (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCurrent 
                        ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-500/20 shadow-xs' 
                        : isCompleted
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-100 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div 
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="w-4 h-4 text-white" /> : idx + 1}
                        </div>

                        {isCurrent && (
                          <span className="bg-sky-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md animate-pulse">
                            En curso
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {step.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHECKPOINTS / HISTORIAL DE EVENTOS DETALLADO (Bitácora de Puntos de Control) */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Historial de Eventos & Puntos de Control en Tiempo Real:</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {activeShipment.checkpoints.length} hitos registrados
              </span>
            </div>

            <div className="space-y-3">
              {activeShipment.checkpoints.map((cp, idx) => (
                <div 
                  key={cp.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                    cp.isCurrent
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      cp.isCurrent 
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx === 0 ? <Check className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {cp.status}
                        </span>
                        {cp.isCurrent && (
                          <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                            Punto Actual
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                        {cp.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-sky-600" />
                          {cp.location} ({cp.city})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 font-mono text-xs text-slate-500">
                    <span className="font-bold text-slate-800 block">{cp.date}</span>
                    <span className="text-[11px] text-slate-500">{cp.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Package Content Card & WhatsApp Support Action */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <img 
                src={activeShipment.productImage} 
                alt={activeShipment.productTitle}
                className="w-16 h-16 rounded-xl object-cover bg-white border border-slate-200 shrink-0 shadow-2xs"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 space-y-0.5">
                <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
                  Contenido del paquete verificado:
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {activeShipment.productTitle}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black font-mono text-emerald-700">
                    {formatCOP(activeShipment.totalCOP)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">• 1 paquete inspeccionado</span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Advisor Contact Button */}
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola Zavela Store, quisiera consultar el estado de mi guía ${activeShipment.trackingNumber} de ${activeShipment.carrier} para el pedido #${activeShipment.orderNumber}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg shrink-0 uppercase tracking-wider"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Soporte WhatsApp Transportadora</span>
            </a>
          </div>

        </div>
      )}
    </div>
  );
};
