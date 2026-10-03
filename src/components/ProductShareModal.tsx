import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Mail,
  Send,
  MessageCircle,
  Truck,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';

interface ProductShareModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'recommend' | 'gift' | 'deal' | 'ruleta_closing';
  isLuckyWheelEnabled?: boolean;
}

export const ProductShareModal: React.FC<ProductShareModalProps> = ({
  product,
  isOpen,
  onClose,
  initialMode = 'recommend',
  isLuckyWheelEnabled = true
}) => {
  if (!isOpen || !product) return null;

  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const effectiveInitialMode = (initialMode === 'ruleta_closing' && !isLuckyWheelEnabled) ? 'recommend' : initialMode;
  const [selectedCustomMessage, setSelectedCustomMessage] = useState<'recommend' | 'gift' | 'deal' | 'ruleta_closing'>(effectiveInitialMode);

  // Sync if initialMode changes
  useEffect(() => {
    if (initialMode) {
      setSelectedCustomMessage((initialMode === 'ruleta_closing' && !isLuckyWheelEnabled) ? 'recommend' : initialMode);
    }
  }, [initialMode, isLuckyWheelEnabled, product?.id]);

  // Build full canonical product URL (with or without ruleta parameter)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://zavelastore.com';
  const isRuletaMode = selectedCustomMessage === 'ruleta_closing';
  const activeProductUrl = isRuletaMode 
    ? `${baseUrl}/?product=${product.id}&ruleta=true` 
    : `${baseUrl}/?product=${product.id}`;
  const priceFormatted = formatCOP(product.price);

  // Customized share messages depending on customer intent
  const messageVariants = {
    recommend: `🔥 ¡Mira este producto que encontré en Zavela Store! 🇨🇴\n\n📦 *${product.title}*\n💰 *Precio:* ${priceFormatted} COP\n🚚 *¡Pagas al recibir en tus manos con PAGO CONTRA ENTREGA!*\n🛡️ Garantía oficial de 30 días.\n\n👉 Míralo aquí: ${baseUrl}/?product=${product.id}`,
    gift: `🎁 ¡Mira esta excelente idea de regalo en Zavela Store!\n\n✨ *${product.title}*\n💵 *Solo:* ${priceFormatted} COP\n🚚 Envío a toda Colombia con pago contra entrega.\n\n👇 Entra al enlace para ver fotos y detalles: ${baseUrl}/?product=${product.id}`,
    deal: `🚨 ¡OFERTA IMPERDIBLE EN COLOMBIA! 😱\n\n💥 *${product.title}* por solo *${priceFormatted}*\n📦 Recibes en la puerta de tu casa y pagas seguro al mensajero.\n\n🏃💨 Pídelo antes de que se agote: ${baseUrl}/?product=${product.id}`,
    ruleta_closing: `🔥 ¡Hola! Te comparto tu enlace de compra exclusivo para *${product.title}* con Ruleta de Descuentos 🇨🇴📦\n\n💰 *Precio Catálogo:* ${priceFormatted} COP\n🚚 *¡Pagas seguro en efectivo al recibir en tus manos con PAGO CONTRA ENTREGA!*\n🛡️ *Garantía oficial de 30 días.*\n🎁 *¡Gira la Ruleta en el enlace y desbloquea entre 5% y 15% OFF de regalo para tu pedido!*\n\n👉 Entra aquí, gira tu ruleta y pide contra entrega: ${baseUrl}/?product=${product.id}&ruleta=true`
  };

  const currentMessage = messageVariants[selectedCustomMessage];

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(activeProductUrl);
      } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = activeProductUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const handleCopyMessage = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentMessage);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error al copiar texto:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.title} | Zavela Store Colombia`,
          text: isRuletaMode 
            ? `🎁 Gira la Ruleta y gana hasta 15% OFF en ${product.title}. ¡Pago Contra Entrega en toda Colombia!`
            : `🔥 ${product.title} por ${priceFormatted}. ¡Pago Contra Entrega en toda Colombia!`,
          url: activeProductUrl
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  // Social Share Handlers
  const handleShareWhatsApp = () => {
    const textEncoded = encodeURIComponent(currentMessage);
    window.open(`https://api.whatsapp.com/send?text=${textEncoded}`, '_blank');
  };

  const handleShareFacebook = () => {
    const urlEncoded = encodeURIComponent(activeProductUrl);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${urlEncoded}`, '_blank', 'width=600,height=500');
  };

  const handleShareMessenger = () => {
    const urlEncoded = encodeURIComponent(activeProductUrl);
    window.open(`https://www.facebook.com/dialog/send?link=${urlEncoded}&app_id=291494419198&redirect_uri=${urlEncoded}`, '_blank');
  };

  const handleShareTelegram = () => {
    const urlEncoded = encodeURIComponent(activeProductUrl);
    const textEncoded = encodeURIComponent(isRuletaMode ? `🎁 Ruleta de Descuentos para ${product.title} - Pago Contra Entrega` : `🔥 ${product.title} - ${priceFormatted} con Pago Contra Entrega en Colombia`);
    window.open(`https://t.me/share/url?url=${urlEncoded}&text=${textEncoded}`, '_blank');
  };

  const handleShareTwitter = () => {
    const textEncoded = encodeURIComponent(isRuletaMode ? `🎁 Gira la Ruleta de descuentos para ${product.title} en @ZavelaStore. Pago Contra Entrega 🇨🇴📦` : `🔥 ¡Mira este producto en @ZavelaStore! ${product.title} por ${priceFormatted}. Pago Contra Entrega en toda Colombia 🇨🇴📦`);
    const urlEncoded = encodeURIComponent(activeProductUrl);
    window.open(`https://twitter.com/intent/tweet?text=${textEncoded}&url=${urlEncoded}`, '_blank');
  };

  const handleShareTikTok = async () => {
    await handleCopyMessage();
    window.open('https://www.tiktok.com/', '_blank');
  };

  const handleShareInstagram = async () => {
    await handleCopyMessage();
    window.open('https://www.instagram.com/', '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(isRuletaMode ? `🎁 Ruleta de Descuentos para ${product.title} en Zavela Store` : `Te recomiendo ver este producto: ${product.title} en Zavela Store`);
    const body = encodeURIComponent(currentMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // QR Code Image via standard Google Chart / QR API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(activeProductUrl)}&margin=10`;

  return (
    <div
      id="product-share-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="product-share-modal-dialog"
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient badge */}
        <div className="p-5 bg-gradient-to-r from-[#0A1128] via-[#101F42] to-[#0A1128] text-white border-b border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-pink-500/20 via-purple-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 text-white flex items-center justify-center font-black shadow-lg shadow-purple-500/30">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <span>Compartir este Producto</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    Viral Boost
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Recomiéndalo a amigos, familiares o en tus redes sociales
                </p>
              </div>
            </div>

            <button
              id="btn-close-share-modal"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Card Highlight */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
          <img
            src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
            alt={product.title}
            className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                {priceFormatted} COP
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Truck className="w-3 h-3 text-sky-600" />
                Pago Contra Entrega
              </span>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[65vh]">
          
          {/* Native Mobile Share Button (If Supported) */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              id="btn-native-mobile-share"
              onClick={handleNativeShare}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Smartphone className="w-4 h-4" />
              <span>COMPARTIR DESDE MI CELULAR (WHATSAPP, INSTAGRAM, ETC.)</span>
            </button>
          )}

          {/* Social Icons Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Selecciona una Red Social o App:
              </label>
              <span className="text-[10px] text-slate-400 font-bold">1 clic para enviar</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2.5">
              
              {/* WhatsApp */}
              <button
                id="share-whatsapp-btn"
                onClick={handleShareWhatsApp}
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-emerald-950 dark:text-emerald-300 group shadow-2xs"
                title="Compartir por WhatsApp"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:rotate-6 transition-transform">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <span className="text-[11px] font-black">WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                id="share-facebook-btn"
                onClick={handleShareFacebook}
                className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-blue-950 dark:text-blue-300 group shadow-2xs"
                title="Compartir en Facebook"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/30 group-hover:rotate-6 transition-transform">
                  f
                </div>
                <span className="text-[11px] font-black">Facebook</span>
              </button>

              {/* Messenger */}
              <button
                id="share-messenger-btn"
                onClick={handleShareMessenger}
                className="p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-indigo-950 dark:text-indigo-300 group shadow-2xs"
                title="Compartir por Messenger"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00B2FF] to-[#006AFF] text-white flex items-center justify-center shadow-md shadow-indigo-500/30 group-hover:rotate-6 transition-transform">
                  <Send className="w-4 h-4 fill-current" />
                </div>
                <span className="text-[11px] font-black">Messenger</span>
              </button>

              {/* Instagram */}
              <button
                id="share-instagram-btn"
                onClick={handleShareInstagram}
                className="p-3 rounded-2xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/30 dark:hover:bg-pink-950/50 border border-pink-200 dark:border-pink-800/50 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-pink-950 dark:text-pink-300 group shadow-2xs"
                title="Copiar texto y abrir Instagram"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-pink-500/30 group-hover:rotate-6 transition-transform">
                  IG
                </div>
                <span className="text-[11px] font-black">Instagram</span>
              </button>

              {/* TikTok */}
              <button
                id="share-tiktok-btn"
                onClick={handleShareTikTok}
                className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-white group shadow-2xs"
                title="Copiar texto y abrir TikTok"
              >
                <div className="w-10 h-10 rounded-2xl bg-black text-cyan-400 border border-cyan-400/40 flex items-center justify-center font-black text-xs shadow-md group-hover:rotate-6 transition-transform">
                  TT
                </div>
                <span className="text-[11px] font-black text-slate-100">TikTok</span>
              </button>

              {/* Telegram */}
              <button
                id="share-telegram-btn"
                onClick={handleShareTelegram}
                className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-sky-950 dark:text-sky-300 group shadow-2xs"
                title="Compartir por Telegram"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center shadow-md shadow-sky-500/30 group-hover:rotate-6 transition-transform">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black">Telegram</span>
              </button>

              {/* Twitter / X */}
              <button
                id="share-twitter-btn"
                onClick={handleShareTwitter}
                className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-slate-900 dark:text-white group shadow-2xs"
                title="Compartir en X (Twitter)"
              >
                <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-black text-sm shadow-md group-hover:rotate-6 transition-transform">
                  𝕏
                </div>
                <span className="text-[11px] font-black">X (Twitter)</span>
              </button>

              {/* Email */}
              <button
                id="share-email-btn"
                onClick={handleShareEmail}
                className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 cursor-pointer text-amber-950 dark:text-amber-300 group shadow-2xs"
                title="Compartir por Correo Electrónico"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:rotate-6 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black">Correo</span>
              </button>
            </div>
          </div>

          {/* Copy Direct Link Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Enlace Directo del Producto:</span>
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQr ? 'Ocultar Código QR' : 'Ver Código QR'}</span>
              </button>
            </label>

            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <input
                type="text"
                readOnly
                value={activeProductUrl}
                className="flex-1 px-3 py-2 bg-transparent text-xs font-mono text-slate-700 dark:text-slate-300 focus:outline-hidden truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-900 text-white dark:bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Optional In-Person QR Code Display */}
          {showQr && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 mb-2">
                <img
                  src={qrCodeUrl}
                  alt="Código QR del Producto"
                  className="w-40 h-40 object-contain"
                />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white">
                Escanea este código con la cámara de tu celular
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mt-0.5">
                Ideal para mostrarle a un amigo o cliente en persona para que lo abra al instante.
              </p>
            </div>
          )}

          {/* Message Style Customizer */}
          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Texto Persuasivo Pre-escrito:</span>
              </label>
              
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-black text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar Todo el Texto</span>
              </button>
            </div>

            <div className={`grid ${isLuckyWheelEnabled ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} gap-2`}>
              {[
                ...(isLuckyWheelEnabled ? [{ key: 'ruleta_closing', label: '🎯 Cierre Ruleta', desc: '🎁 5%-15% OFF sorpresa', highlight: true }] : []),
                { key: 'recommend', label: '💡 Recomendar', desc: 'Foco en confianza', highlight: false },
                { key: 'deal', label: '🔥 Oferta Flash', desc: 'Urgencia y stock', highlight: false },
                { key: 'gift', label: '🎁 Regalo', desc: 'Detalle especial', highlight: false }
              ].map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setSelectedCustomMessage(v.key as any)}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    selectedCustomMessage === v.key
                      ? v.highlight
                        ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-400 text-amber-950 dark:text-amber-300 font-black shadow-xs'
                        : 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-950 dark:text-purple-200 font-black shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{v.label}</span>
                    {v.highlight && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                    )}
                  </div>
                  <div className="text-[9px] opacity-80 font-normal">{v.desc}</div>
                </button>
              ))}
            </div>

            {isRuletaMode && (
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <span className="text-base shrink-0">🎯</span>
                <span className="text-[11px] leading-tight">
                  <strong>Modo Cierre de Venta:</strong> Al abrir este enlace, el cliente verá este producto y se le activará la Ruleta de Descuentos con un cupón del 5% al 15% OFF para cerrar la compra de inmediato.
                </span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-mono whitespace-pre-line leading-relaxed">
              {currentMessage}
            </div>
          </div>

          {/* Colombian COD Trust Note */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Tus amigos recibirán el producto con <strong>Pago Contra Entrega en efectivo</strong> y 30 días de garantía oficial en toda Colombia.
            </span>
          </div>

        </div>

        {/* Footer Close */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
