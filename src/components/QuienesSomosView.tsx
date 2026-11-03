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
  Clock, 
  PackageCheck,
  Compass,
  MessageCircle,
  Award,
  Globe2,
  ChevronRight
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
  whatsappNumber = '573157894512'
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
    const message = encodeURIComponent('¡Hola Zavela Store! Quisiera conocer más sobre sus productos y servicios.');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col">
      
      {/* Breadcrumb Bar */}
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
            <span>COBERTURA TOTAL COLOMBIA</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">PAGO CONTRA ENTREGA 100% SEGURO</span>
          </div>
        </div>
      </div>

      {/* 1. Modern Corporate Hero Banner */}
      <section className="relative overflow-hidden bg-slate-950 text-white border-b border-slate-800">
        {/* Subtle architectural gradient mesh background */}
        <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-[#050811] opacity-95" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Brand Statement */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-mono text-sky-400">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Nuestra Esencia & Trayectoria Corporativa</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight" style={{ textWrap: 'balance' }}>
                Conectando a Colombia con lo Mejor en{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400">
                  Innovación y Confianza
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
                En <strong>Zavela Store</strong> creemos que cada colombiano merece acceder a productos novedosos, útiles y de calidad superior con absoluta tranquilidad. Eliminamos los riesgos de compra por internet mediante nuestro modelo de <strong>pago contra entrega en efectivo</strong> y envíos rápidos en todo el territorio nacional.
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

            {/* Right Column: Visual Brand Card with Live Proof Indicators */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 p-7 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">Zavela Store Colombia</h3>
                      <p className="text-xs text-slate-400 font-mono">E-Commerce Certificado</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
                    OFICIAL
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-6 border-b border-slate-800">
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums">+15,000</p>
                    <p className="text-xs text-slate-400">Entregas Exitosas</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">100%</p>
                    <p className="text-xs text-slate-400">Pago Contra Entrega</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-sky-400 font-mono tabular-nums">1,100+</p>
                    <p className="text-xs text-slate-400">Municipios Cubiertos</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">30 Días</p>
                    <p className="text-xs text-slate-400">Garantía Directa</p>
                  </div>
                </div>

                <div className="pt-6 flex items-center gap-3 text-xs text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Tu tranquilidad es primero: Pagas al recibir en tu puerta con Servientrega, Coordinadora, Envía o Interrapidísimo.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. Detailed Explanatory Section "¿Quiénes Somos?" */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-sky-600 font-bold uppercase tracking-wider text-xs font-mono">
              Autenticidad & Propósito
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              ¿Quiénes Somos en Zavela Store?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Somos una compañía colombiana de comercio electrónico nacida con un propósito claro: democratizar el acceso a las últimas tendencias en tecnología, hogar, cuidado personal y estilo de vida con un estándar de servicio impecable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Origen y Visión Práctica */}
            <div className="rounded-2xl p-7 bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Origen & Selección Cuidadosa</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  No vendemos cualquier producto. Nuestro equipo de curaduría evalúa constantemente fabricantes, proveedores verificados y las tendencias más demandadas para asegurar que cada artículo cumpla con estrictos criterios de funcionalidad, durabilidad y valor real.
                </p>
              </div>
              <div className="pt-2 text-xs text-sky-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span>Control de calidad antes de despachar</span>
              </div>
            </div>

            {/* Card 2: Logística Estratégica Nacional */}
            <div className="rounded-2xl p-7 bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Logística Ágil y Descentralizada</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Operamos con bodegas estratégicas en los principales nodos logísticos de Colombia (Bogotá D.C., Medellín, Cali y la Costa Caribe), permitiéndonos ofrecer despachos prioritarios en 2 a 5 días hábiles a cualquier cabecera municipal.
                </p>
              </div>
              <div className="pt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Rastreo de guía en tiempo real</span>
              </div>
            </div>

            {/* Card 3: Cercanía y Soporte Humano */}
            <div className="rounded-2xl p-7 bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Atención Cálida y Respaldo Real</h3>
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Detrás de cada pedido hay asesores dedicados en Colombia listos para ayudarte vía WhatsApp o correo electrónico. Desde la confirmación del despacho hasta la entrega y el uso del producto, nunca estás solo.
                </p>
              </div>
              <div className="pt-2 text-xs text-indigo-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>Garantía de satisfacción y soporte posventa</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. The 4 Fundamental Pillars Grid */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs font-mono">
              Fundamentos Estratégicos
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Nuestros 4 Pilares Fundamentales
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Cada decisión que tomamos en Zavela Store está guiada por cuatro principios inquebrantables que aseguran excelencia y confianza a largo plazo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Pilar 1: MISIÓN */}
            <div className="relative rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-9 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none group-hover:bg-sky-100 transition-colors" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-600 flex items-center justify-center">
                    <Target className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    Pilar 01
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Misión
                </h3>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Brindar a cada hogar y consumidor colombiano una experiencia de compra online ágil, transparente y placentera, acercando productos innovadores y de probada utilidad que mejoren su calidad de vida, sin barreras financieras ni temores de fraude, garantizando la tranquilidad absoluta del pago contra entrega en todo el país.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-700">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                <span>Compromiso con el bienestar y accesibilidad del cliente</span>
              </div>
            </div>

            {/* Pilar 2: VISIÓN */}
            <div className="relative rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-9 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none group-hover:bg-indigo-100 transition-colors" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center">
                    <Eye className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    Pilar 02
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Visión
                </h3>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Posicionarnos como la plataforma de comercio electrónico de mayor confianza, recordación y lealtad en Colombia, liderando la evolución de las compras seguras a través de tecnología inteligente, logística predictiva y una comunidad sólida construida sobre la honestidad, el servicio y la satisfacción continua.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-indigo-700">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>Liderazgo ético y expansión responsable</span>
              </div>
            </div>

            {/* Pilar 3: COMPROMISO (Seguridad & Pagos Contra Entrega) */}
            <div className="relative rounded-3xl bg-white border border-emerald-200/90 p-8 sm:p-9 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none group-hover:bg-emerald-100 transition-colors" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center">
                    <HeartHandshake className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Pilar 03 • Confianza Total
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Compromiso y Seguridad Total
                </h3>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Nuestra política central es <strong className="text-emerald-800">Cero Riesgo para el Comprador</strong>. Sabemos que en Colombia la seguridad es primordial. Por ello, respaldamos cada pedido con el servicio de <strong>Pago Contra Entrega en efectivo</strong>, verificación de guía con transportadoras oficiales (Servientrega, Coordinadora, Envía, Interrapidísimo, TCC) y garantía directa de 30 días con reemplazo inmediato ante defectos de fábrica.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Pagas únicamente cuando recibes el producto en tus manos</span>
              </div>
            </div>

            {/* Pilar 4: INNOVACIÓN (Tecnología & Atención Inteligente) */}
            <div className="relative rounded-3xl bg-white border border-purple-200/90 p-8 sm:p-9 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -mr-8 -mt-8 pointer-events-none group-hover:bg-purple-100 transition-colors" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-700 flex items-center justify-center">
                    <Cpu className="w-7 h-7" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                    Pilar 04 • Vanguardia
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Innovación y Atención Inteligente
                </h3>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Aprovechamos herramientas tecnológicas de última generación para optimizar cada paso de tu compra: catálogos interactivos, motores de recomendación, seguimiento en vivo de tu envío por número de guía o teléfono, y atención multicanal automatizada pero con calidez humana para asesorarte de manera precisa y sin esperas innecesarias.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-purple-700">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Sistemas de vanguardia al servicio de tu comodidad</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Trust Quote / Manifesto Callout */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto border border-sky-100">
            <Award className="w-6 h-6" />
          </div>
          <blockquote className="text-lg sm:text-xl font-medium text-slate-800 italic leading-relaxed">
            "Comprar por internet en Colombia no debe ser un acto de fe, sino una experiencia confiable, transparente y emocionante desde el primer clic hasta que abres el paquete en tu puerta."
          </blockquote>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
            — Filosofía de Operación Zavela Store • Colombia
          </p>
        </div>
      </section>

      {/* 4. Corporate Footer with SM Studio Signature */}
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
              <span>•</span>
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
