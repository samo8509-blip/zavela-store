import React, { useState } from 'react';
import { 
  Share2, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  ExternalLink,
  Check,
  Send
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';

interface AdminContactSocialProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminContactSocial: React.FC<AdminContactSocialProps> = ({
  settings,
  onSaveSettings
}) => {
  const [whatsapp, setWhatsapp] = useState(settings.whatsappNumber || '573123456789');
  const [whatsappMessage, setWhatsappMessage] = useState(settings.whatsappDefaultMessage || 'Hola Zavela Store, quiero más información sobre sus productos y envíos.');
  const [phone, setPhone] = useState(settings.contactPhone || '312 345 6789');
  const [email, setEmail] = useState(settings.contactEmail || 'contacto@zavelastore.com');
  const [address, setAddress] = useState(settings.contactAddress || 'Centro Empresarial Calle 93 # 14 - 20');
  const [city, setCity] = useState(settings.contactCity || 'Bogotá D.C., Colombia');
  const [hours, setHours] = useState(settings.businessHours || 'Lunes a Sábado: 8:00 AM - 7:00 PM');
  
  // Social links
  const [instagram, setInstagram] = useState(settings.socialLinks?.instagram || 'https://instagram.com/zavelastore');
  const [tiktok, setTiktok] = useState(settings.socialLinks?.tiktok || 'https://tiktok.com/@zavelastore');
  const [facebook, setFacebook] = useState(settings.socialLinks?.facebook || 'https://facebook.com/zavelastore');

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        whatsappNumber: whatsapp,
        whatsappDefaultMessage: whatsappMessage,
        contactPhone: phone,
        contactEmail: email,
        contactAddress: address,
        contactCity: city,
        businessHours: hours,
        socialLinks: {
          instagram,
          tiktok,
          facebook
        }
      });
      alert('Información de contacto y redes sociales guardada.');
    } catch (err: any) {
      alert('Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const testWhatsAppUrl = `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            GRUPO 2: ENCABEZADO & CONTACTO
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Canales de Contacto & Redes Sociales
          </h2>
          <p className="text-xs text-slate-500">
            Administra los números de WhatsApp para pedidos, horarios de atención y enlaces a redes.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          {isSaving ? 'Guardando...' : 'Guardar Canales'}
        </button>
      </div>

      {/* WhatsApp Main Focus Box */}
      <div className="bg-gradient-to-br from-emerald-950 to-slate-900 p-6 rounded-3xl border border-emerald-800/40 text-white space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <MessageCircle className="w-5 h-5" />
            <span>Canal Principal de Ventas WhatsApp</span>
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
            Botón Flotante Activo
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-emerald-200 mb-1">
              Número de WhatsApp (con código 57 para Colombia)
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="573123456789"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-emerald-700/50 rounded-xl text-white font-mono focus:border-emerald-400 outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-emerald-200 mb-1">
              Mensaje Predefinido de Bienvenida
            </label>
            <input
              type="text"
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-emerald-700/50 rounded-xl text-white focus:border-emerald-400 outline-hidden"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-emerald-900/60">
          <span className="text-[11px] text-slate-400">
            Prueba cómo interactúa el cliente al hacer clic en el botón de WhatsApp:
          </span>
          <a
            href={testWhatsAppUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Probar Enlace WhatsApp en Vivo</span>
          </a>
        </div>
      </div>

      {/* Grid: Contact info & Social Media */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Contact Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Ubicación y Atención al Cliente</h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Fijo / PBX</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email de Soporte / Ventas</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dirección del Centro de Despacho</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ciudad y País</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Horario de Despacho y Soporte</label>
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden"
            />
          </div>
        </div>

        {/* Social Media Links */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">Perfiles en Redes Sociales</h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Instagram URL</label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                <Instagram className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">TikTok URL</label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 font-bold text-xs">
                TT
              </div>
              <input
                type="url"
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Facebook FanPage URL</label>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Facebook className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
            💡 Estos enlaces se renderizan automáticamente en el pie de página (Footer), en las confirmaciones de compra y en el menú de navegación móvil.
          </div>
        </div>

      </div>

    </div>
  );
};
