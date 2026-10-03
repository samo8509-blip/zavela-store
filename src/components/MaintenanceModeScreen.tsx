import React, { useState } from 'react';
import { 
  Wrench, 
  MessageCircle, 
  Mail, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  Lock, 
  Gift, 
  Clock, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { StoreSettings } from '../types/index.ts';
import { saveFirestoreSettings } from '../services/firestoreSettings.ts';

interface MaintenanceModeScreenProps {
  settings: StoreSettings | null;
  onOpenAdminLogin: () => void;
  onNotifyLeadRegistered?: (contact: string) => void;
}

export const MaintenanceModeScreen: React.FC<MaintenanceModeScreenProps> = ({
  settings,
  onOpenAdminLogin,
  onNotifyLeadRegistered
}) => {
  const [contactInput, setContactInput] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Official WhatsApp Contact
  const rawPhone = settings?.whatsappSettings?.phoneNumber || settings?.whatsappNumber || '573008784427';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const urgentWhatsAppText = encodeURIComponent(
    '¡Hola Zavela Store Colombia! Vi que la tienda está en mantenimiento y tengo una consulta urgente sobre un producto/pedido.'
  );
  const urgentWhatsAppUrl = `https://wa.me/${cleanPhone}?text=${urgentWhatsAppText}`;

  // Custom Message from Settings or Default
  const displayTitle = settings?.maintenanceTitle || 'Estamos realizando mejoras en nuestra tienda';
  const displayMessage = settings?.maintenanceMessage || 'Estamos mejorando tu experiencia de compra. Volvemos muy pronto con nuevas ofertas exclusivas.';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = contactInput.trim();
    if (!trimmed) {
      setErrorMsg(contactType === 'email' ? 'Por favor ingresa tu correo electrónico.' : 'Por favor ingresa tu número de WhatsApp.');
      return;
    }

    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setErrorMsg('Por favor ingresa un correo electrónico válido (ej. tu_correo@gmail.com).');
        return;
      }
    } else {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 7) {
        setErrorMsg('Por favor ingresa un número de teléfono o WhatsApp válido de Colombia.');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // 1. Guardar en Servidor Local API
      await fetch('/api/admin/maintenance/notify-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: trimmed,
          type: contactType,
          name: contactName.trim() || undefined
        })
      }).catch(err => console.warn('Error saving lead to API:', err));

      // 2. Guardar en Cloud Firestore para persistencia permanente
      try {
        const currentLeads = Array.isArray(settings?.maintenanceNotifyLeads) ? [...settings.maintenanceNotifyLeads] : [];
        const newLead = {
          id: `lead-${Date.now()}`,
          contact: trimmed,
          type: contactType,
          name: contactName.trim() || undefined,
          createdAt: new Date().toISOString()
        };
        await saveFirestoreSettings({
          maintenanceNotifyLeads: [newLead, ...currentLeads.slice(0, 100)]
        });
      } catch (err) {
        console.warn('Firestore lead save warning:', err);
      }

      // 3. Guardar en LocalStorage
      try {
        const stored = localStorage.getItem('zavela_maintenance_leads') || '[]';
        const parsed = JSON.parse(stored);
        parsed.unshift({ contact: trimmed, type: contactType, date: new Date().toISOString() });
        localStorage.setItem('zavela_maintenance_leads', JSON.stringify(parsed));
      } catch {}

      setHasSubscribed(true);
      if (onNotifyLeadRegistered) {
        onNotifyLeadRegistered(trimmed);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error. Por favor intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060D1E] via-[#0B1528] to-[#0A1128] text-white flex flex-col justify-between selection:bg-sky-500 selection:text-white relative overflow-hidden font-sans">
      
      {/* Background Ambient Glow & Subtle Texture */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#48CAE4_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Header Bar with Zavela Logo */}
      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZavelaLogo size="md" showSlogan={true} theme="dark" />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              Mantenimiento Programado
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero Card Container */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center justify-center text-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm shadow-sky-500/10 animate-bounce">
          <Wrench className="w-4 h-4 text-sky-400" />
          <span>Experiencia de Compra en Optimización</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mb-4">
          {displayTitle}
        </h1>

        {/* Message */}
        <p className="text-base sm:text-lg text-slate-300 font-medium max-w-2xl leading-relaxed mb-8">
          {displayMessage}
        </p>

        {/* Urgent WhatsApp Direct Button (Prominent Call to Action) */}
        <div className="mb-10 w-full sm:w-auto">
          <a
            href={urgentWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-900/40 hover:shadow-emerald-700/50 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border border-emerald-400/30 w-full sm:w-auto"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="block leading-tight text-white font-extrabold">¿Tienes una consulta urgente o pedido en camino?</span>
              <span className="block text-[11px] text-emerald-100 font-medium font-mono">Escríbenos directamente a WhatsApp oficial 🇨🇴</span>
            </div>
          </a>
        </div>

        {/* Lead Notification Box: "Avísame automáticamente cuando la tienda abra" */}
        <div className="w-full max-w-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-10 text-left">
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Sé el primero en enterarte de la reapertura
              </h2>
              <p className="text-xs text-slate-400">
                Déjanos tu correo o WhatsApp y recibirás un cupón exclusivo de bienvenida con <strong className="text-amber-300">10% OFF</strong>.
              </p>
            </div>
          </div>

          {!hasSubscribed ? (
            <form onSubmit={handleSubscribe} className="space-y-4">
              
              {/* Type Selector (WhatsApp or Email) */}
              <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setContactType('whatsapp')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                    contactType === 'whatsapp' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Avisarme por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContactType('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all cursor-pointer ${
                    contactType === 'email' 
                      ? 'bg-sky-600 text-white shadow-xs' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Avisarme por Correo</span>
                </button>
              </div>

              {/* Name (Optional) */}
              <div>
                <input
                  type="text"
                  placeholder="Tu nombre (opcional)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              {/* Contact Input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  {contactType === 'whatsapp' ? (
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs text-slate-400 font-mono font-bold flex items-center gap-1 pointer-events-none">
                        🇨🇴 +57
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="300 123 4567"
                        value={contactInput}
                        onChange={(e) => setContactInput(e.target.value)}
                        className="w-full pl-20 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-emerald-400 transition-colors"
                      />
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="tu_correo@ejemplo.com"
                        value={contactInput}
                        onChange={(e) => setContactInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-400 transition-colors"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span>Avisarme</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold mt-1">
                  {errorMsg}
                </p>
              )}

              <p className="text-[11px] text-slate-400 font-medium">
                🔒 Respetamos tu privacidad. Cero spam, solo una notificación directa cuando reabramos con las nuevas promociones.
              </p>

            </form>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center animate-in zoom-in-95 duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="font-black text-base text-white mb-1">¡Registro Confirmado con Éxito!</h3>
              <p className="text-xs text-emerald-200 mb-3">
                Te hemos reservado un cupón de <strong>10% OFF</strong> para tu primera compra cuando la tienda reabra sus puertas.
              </p>
              <div className="inline-block bg-black/40 border border-emerald-400/30 px-3 py-1.5 rounded-lg font-mono text-xs font-black text-amber-300">
                CUPÓN: ZAVELA_VIP_REAPERTURA
              </div>
            </div>
          )}

        </div>

        {/* Value Pillars of Zavela Store */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left">
          
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white">Pago Contra Entrega</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Paga seguro en efectivo cuando recibas en tu casa u oficina.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white">Garantía Protegida</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">30 días de garantía total en todos nuestros productos certificados.</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white">Nuevas Ofertas</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Volvemos con precios especiales y regalos de temporada.</p>
            </div>
          </div>

        </div>

      </main>

      {/* Footer with Discreet Admin Access */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} Zavela Store Colombia. Todos los derechos reservados.
          </div>

          {/* Discreet Admin Login Button */}
          <div>
            <button
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-[11px] font-bold p-1 rounded hover:bg-white/5"
              title="Acceso exclusivo para el personal administrador de la tienda"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Acceso Administrativo</span>
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
