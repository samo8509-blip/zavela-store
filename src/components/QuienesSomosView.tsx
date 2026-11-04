import React from 'react';
import { 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  Target, 
  Eye, 
  HeartHandshake, 
  Cpu, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  ShoppingBag, 
  Users, 
  PackageCheck,
  Compass,
  MessageCircle,
  Award,
  ChevronRight,
  MapPin,
  Bot,
  Layers,
  SearchCheck,
  Clock3,
  BadgeCheck
} from 'lucide-react';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { SergioMartinezSignature } from './SergioMartinezSignature.tsx';

interface QuienesSomosViewProps {
  onGoHome?: () => void;
  onExploreCatalog?: () => void;
  onOpenTracking?: () => void;
  onOpenAuthorCertificate?: () => void;
  whatsappNumber?: string;
}

export const QuienesSomosView: React.FC<QuienesSomosViewProps> = ({
  onGoHome,
  onExploreCatalog,
  onOpenTracking,
  onOpenAuthorCertificate,
  whatsappNumber = '573133595427'
}) => {
  const handleCatalogClick = () => {
    if (onExploreCatalog) {
      onExploreCatalog();
    } else if (onGoHome) {
      onGoHome();
    }
  };

  const handleWhatsAppContact = () => {
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent('¡Hola Zavela Store! Quisiera consultar más detalles sobre la tienda y hacer un pedido.');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col">
      
      {/* Breadcrumb Navigation */}
      <div className="w-full bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <button 
              onClick={onGoHome}
              className="hover:text-sky-600 transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              Inicio
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-semibold">Quiénes Somos</span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-500">
            <span>COBERTURA TOTAL EN 32 DEPARTAMENTOS</span>
            <span>·</span>
            <span className="text-emerald-600 font-bold">PAGO CONTRA ENTREGA 100% SEGURO</span>
          </div>
        </div>
      </div>

      {/* 1. Modern Corporate Hero Banner */}
      <section className="relative overflow-hidden bg-slate-950 text-white border-b border-slate-800">
        {/* Architectural atmospheric background */}
        <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-[#050811] opacity-95" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Brand Headline & Vision Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 border border-slate-700/80 text-xs font-mono text-sky-400">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Nuestra Esencia & Valores Corporativos</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight" style={{ textWrap: 'balance' }}>
                Conectando a Colombia con lo Mejor en{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
                  Innovación y Confianza
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
                En <strong>Zavela Store</strong> transformamos la forma en que los colombianos compran por internet. Eliminamos la incertidumbre y el riesgo con un modelo transparente, atención inteligente y la garantía de <strong>Pago Contra Entrega</strong> en más de 1,100 municipios de los 32 departamentos.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={handleCatalogClick}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Explorar Catálogo Oficial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppContact}
                  className="px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Atención al Cliente</span>
                </button>
              </div>
            </div>

            {/* Right Column: Visual Trust Metric Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 p-7 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Zavela Store Colombia</h3>
                      <p className="text-xs text-slate-400 font-mono">E-Commerce Oficial Certificado</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                    VERIFICADO
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-800">
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">+15,000</p>
                    <p className="text-xs text-slate-400">Entregas en Colombia</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">100%</p>
                    <p className="text-xs text-slate-400">Pago Contra Entrega</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-sky-400 font-mono tabular-nums">32 Deptos</p>
                    <p className="text-xs text-slate-400">Cobertura Nacional</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">30 Días</p>
                    <p className="text-xs text-slate-400">Garantía Directa</p>
                  </div>
                </div>

                <div className="pt-6 flex items-center gap-3 text-xs text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Cero riesgos: Pagas en efectivo solo al recibir tu paquete con Servientrega, Coordinadora, Envía o Interrapidísimo.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. CONTENEDOR ROBUSTO DE VALORES CORPORATIVOS (OPCIÓN 3) - JUSTO DEBAJO DEL BANNER */}
      <section id="valores-corporativos" className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <div className="inline-flex items-center gap-2 text-sky-600 font-bold uppercase tracking-wider text-xs font-mono">
              <Compass className="w-3.5 h-3.5" />
              <span>Pilares Corporativos & Compromiso Nacional</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Los 4 Fundamentos de Zavela Store
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Diseñamos cada aspecto de nuestra tienda para brindarte seguridad total, transparencia de precios y la mejor tecnología en cada entrega en Colombia.
            </p>
          </div>

          {/* 4 Robust Corporate Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            
            {/* TARJETA 1: NUESTRA MISIÓN */}
            <div className="relative rounded-3xl bg-slate-50/70 border-2 border-sky-200/90 hover:border-sky-400 p-8 sm:p-9 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-sky-100/50 rounded-bl-full -mr-12 -mt-12 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 flex items-center justify-center shadow-xs">
                    <Target className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-mono font-bold border border-sky-200">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    <span>32 Departamentos</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600 font-mono">
                    Propósito Central
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    Nuestra Misión
                  </h3>
                </div>

                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Proveer a cada familia y consumidor en los <strong>32 departamentos de Colombia</strong> un catálogo transparente, curado y completamente libre de riesgos. Acercamos productos de tendencia, tecnología y hogar con descripciones veraces, precios justos y sin tarifas ocultas, eliminando las barreras de desconfianza al comprar online.
                </p>

                {/* Key Mission Highlights */}
                <div className="space-y-2 pt-2 border-t border-sky-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Cobertura en más de 1,100 municipios y ciudades capitales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Catálogo verificado contra publicidad engañosa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Costos claros desde el primer vistazo sin sorpresas</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-sky-800">
                <span>Catálogo Transparente & Accesible</span>
                <span className="font-mono text-sky-600">01 / 04</span>
              </div>
            </div>

            {/* TARJETA 2: NUESTRA VISIÓN */}
            <div className="relative rounded-3xl bg-slate-50/70 border-2 border-indigo-200/90 hover:border-indigo-400 p-8 sm:p-9 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-100/50 rounded-bl-full -mr-12 -mt-12 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Eye className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-mono font-bold border border-indigo-200">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Horizonte 2030</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
                    Futuro & Liderazgo
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    Nuestra Visión
                  </h3>
                </div>

                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Consolidarnos para el <strong>año 2030 como la plataforma de e-commerce líder en innovación y confianza</strong> de Colombia. Aspiramos a ser el punto de referencia donde los colombianos compran con la certeza de recibir productos de la más alta calidad, respaldados por una comunidad sólida y un compromiso inquebrantable de excelencia.
                </p>

                {/* Key Vision Highlights */}
                <div className="space-y-2 pt-2 border-t border-indigo-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Liderazgo fundamentado en la satisfacción y lealtad del cliente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Red logística hiperconectada con tiempos de entrega récord</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Cultura de servicio ético y crecimiento comercial sostenible</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-indigo-800">
                <span>E-Commerce Referente Nacional</span>
                <span className="font-mono text-indigo-600">02 / 04</span>
              </div>
            </div>

            {/* TARJETA 3: NUESTRO COMPROMISO */}
            <div className="relative rounded-3xl bg-slate-50/70 border-2 border-emerald-200/90 hover:border-emerald-400 p-8 sm:p-9 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100/50 rounded-bl-full -mr-12 -mt-12 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 flex items-center justify-center shadow-xs">
                    <HeartHandshake className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>100% Contra Entrega</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
                    Garantía & Seguridad
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    Nuestro Compromiso
                  </h3>
                </div>

                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Cero riesgo para tu bolsillo. Implementamos una <strong>garantía de inspección física y pago 100% contra entrega al recibir</strong>. Pagas en efectivo en la puerta de tu hogar únicamente cuando el mensajero te entrega el paquete físico. Además, cuentas con 30 días de garantía oficial directa ante cualquier eventualidad.
                </p>

                {/* Key Commitment Highlights */}
                <div className="space-y-2 pt-2 border-t border-emerald-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Pagas en efectivo al transportador solo tras tener el paquete en mano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Alianzas con Servientrega, Coordinadora, Interrapidísimo, Envía y TCC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Garantía de 30 días con reemplazo rápido sin trámites complicados</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-emerald-800">
                <span>Tranquilidad y Respaldo Total</span>
                <span className="font-mono text-emerald-600">03 / 04</span>
              </div>
            </div>

            {/* TARJETA 4: NUESTRA INNOVACIÓN */}
            <div className="relative rounded-3xl bg-slate-50/70 border-2 border-purple-200/90 hover:border-purple-400 p-8 sm:p-9 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-100/50 rounded-bl-full -mr-12 -mt-12 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
              
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-700 flex items-center justify-center shadow-xs">
                    <Cpu className="w-7 h-7" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-mono font-bold border border-purple-200">
                    <Bot className="w-3.5 h-3.5 text-purple-600" />
                    <span>IA & Rastreo en Vivo</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 font-mono">
                    Tecnología Avanzada
                  </span>
                  <h3 className="text-2xl font-black text-slate-900">
                    Nuestra Innovación
                  </h3>
                </div>

                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  Ponemos la mejor tecnología al servicio del comprador. Utilizamos <strong>inteligencia artificial para optimizar recomendaciones, control de calidad predictivo y rastreo en vivo</strong> de cada pedido mediante número de guía o teléfono celular, brindando respuestas inmediatas y asesoría inteligente las 24 horas.
                </p>

                {/* Key Innovation Highlights */}
                <div className="space-y-2 pt-2 border-t border-purple-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Rastreador interactivo en tiempo real integrado con transportadoras</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Asistente inteligente para resolución ágil de dudas sobre envíos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>Algoritmos de inventario que garantizan existencias reales para despacho</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-between text-xs font-bold text-purple-800">
                <span>Inteligencia & Conectividad en Tiempo Real</span>
                <span className="font-mono text-purple-600">04 / 04</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. Operational Guarantees & Why Zavela Section */}
      <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Certeza Operativa en Colombia
            </span>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900">
              ¿Por qué confiar en Zavela Store?
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm">
              Cada pedido pasa por un riguroso protocolo de despacho antes de salir de nuestras bodegas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <PackageCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Inspección Previa al Envío</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                Verificamos el estado físico, accesorios y empaque de cada producto antes de entregarlo a la transportadora, reduciendo incidencias al mínimo.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Alianzas Logísticas Oficiales</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                Convenios directos con Servientrega, Coordinadora, Interrapidísimo, Envía y TCC para garantizar fletes asegurados en todo el territorio colombiano.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Acompañamiento Personalizado</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                Asesores en Colombia listos para ayudarte vía WhatsApp antes, durante y después de recibir tu compra, garantizando tu satisfacción plena.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Trust Quote / Manifesto Callout */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
            <Award className="w-6 h-6" />
          </div>
          <blockquote className="text-lg sm:text-xl font-medium text-slate-800 italic leading-relaxed" style={{ textWrap: 'balance' }}>
            "Comprar por internet en Colombia debe ser una experiencia de absoluta certeza: ver productos reales, contar con asesoría transparente y tener la tranquilidad de pagar únicamente al recibir en tu puerta."
          </blockquote>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
            — Filosofía de Operación Zavela Store • Colombia
          </p>
        </div>
      </section>

      {/* 5. Corporate Footer with SM Studio Signature */}
      <section className="bg-slate-950 text-white border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Top of corporate footer: Brand + Quick Actions */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-4 text-center md:text-left">
              <ZavelaLogo size="md" showSlogan={true} theme="dark" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCatalogClick}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
                <span>Ver Catálogo</span>
              </button>

              {onOpenTracking && (
                <button
                  type="button"
                  onClick={onOpenTracking}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Rastrear Pedido</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleWhatsAppContact}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Asesoría WhatsApp</span>
              </button>
            </div>
          </div>

          {/* SM Studio Corporate Signature Banner */}
          <div className="bg-gradient-to-r from-[#070D1F] via-[#0E1838] to-[#070D1F] text-white rounded-3xl p-6 sm:p-7 border-2 border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-start relative z-10">
              <SergioMartinezSignature 
                variant="minimal" 
                dark={true}
                onClickCertificate={onOpenAuthorCertificate} 
              />
            </div>

            <div className="hidden xl:flex flex-col items-center text-center px-6 border-x-2 border-cyan-500/30 relative z-10">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-mono font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Arquitectura & Identidad Corporativa</span>
              </div>
              <span className="text-xs text-slate-200 font-bold mt-1 tracking-wide">
                Cartagena Bolivar, Colombia • Sello Oficial SM Studio
              </span>
            </div>

            <div className="w-full lg:w-auto max-w-sm relative z-10">
              <SergioMartinezSignature 
                variant="badge" 
                onClickCertificate={onOpenAuthorCertificate} 
              />
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[10px] uppercase font-mono tracking-wider pt-2">
            <span>© {new Date().getFullYear()} Zavela Store Colombia • Todos los derechos reservados</span>
            <div className="flex items-center gap-2">
              <span>Diseñado y Desarrollado por SM Studio</span>
              <span>·</span>
              <button
                type="button"
                onClick={onOpenAuthorCertificate}
                className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-bold"
              >
                Ver Certificado de Autoría
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
