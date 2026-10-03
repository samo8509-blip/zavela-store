import React, { useState } from 'react';
import { 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  Gift, 
  Copy, 
  Check, 
  Eye, 
  X, 
  Tag, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { 
  subscribeNewsletter, 
  generateAIEmailCampaign, 
  GeneratedAIEmailTemplate,
  NewsletterSubscriber 
} from '../utils/newsletterManager.ts';

interface NewsletterSubscriptionBoxProps {
  currentCategoryInterest?: string;
  showToast?: (msg: string) => void;
}

export const NewsletterSubscriptionBox: React.FC<NewsletterSubscriptionBoxProps> = ({
  currentCategoryInterest,
  showToast
}) => {
  const [email, setEmail] = useState('');
  const [subscribedData, setSubscribedData] = useState<{
    subscriber: NewsletterSubscriber;
    template: GeneratedAIEmailTemplate;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    const interests = currentCategoryInterest && currentCategoryInterest !== 'todos' && currentCategoryInterest !== 'all'
      ? [currentCategoryInterest, 'Tendencias y Ofertas']
      : ['Tendencias Zavela', 'Ofertas Semanales', 'Tecnología'];

    const result = subscribeNewsletter(email.trim(), interests);
    const initialTemplate = generateAIEmailCampaign(result.subscriber);

    setSubscribedData({
      subscriber: result.subscriber,
      template: initialTemplate
    });

    // Asynchronously call backend AI Email Marketing generator if available
    fetch('/api/admin/newsletter/generate-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        interests,
        subscriberName: ''
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data?.success && data?.template) {
          setSubscribedData(prev => prev ? { ...prev, template: data.template } : prev);
        }
      })
      .catch(() => {});

    if (showToast) {
      showToast('🎁 ¡Te has suscrito con éxito! Tu cupón de 10% OFF es BIENVENIDO10.');
    }
  };

  const copyCoupon = () => {
    if (!subscribedData) return;
    navigator.clipboard.writeText(subscribedData.subscriber.discountCodeGenerated || 'BIENVENIDO10');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <>
      <section 
        id="newsletter-subscription-section" 
        className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0A1128] to-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl my-8"
      >
        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Text Block */}
          <div className="space-y-3 text-center lg:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>CLUB VIP ZAVELA STORE</span>
            </div>

            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
              Suscríbete y Recibe Ofertas Exclusivas, Lanzamientos y Recomendaciones a tu Medida
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Obtén un <strong className="text-amber-400">10% de descuento inmediato</strong> en tu primera compra con Pago Contra Entrega en Colombia y entérate antes que nadie de las novedades de temporada.
            </p>

            <div className="flex items-center justify-center lg:justify-start gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Cero spam
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Pago seguro en tu puerta
              </span>
            </div>
          </div>

          {/* Right Form / Success Block */}
          <div className="w-full lg:max-w-md shrink-0">
            {!subscribedData ? (
              <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/15 space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ingresa tu correo electrónico..."
                      required
                      className="w-full pl-10 pr-3 py-3 bg-slate-900/90 text-white placeholder:text-slate-400 rounded-xl border border-slate-700 text-xs focus:border-indigo-400 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md shadow-indigo-600/30"
                  >
                    <span>Unirme</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 text-center font-mono">
                  🎁 Te enviaremos tu cupón de bienvenida al instante.
                </p>
              </form>
            ) : (
              <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/40 space-y-3 shadow-lg animate-scaleUp">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">¡Suscripción confirmada!</span>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Tu Cupón 10% OFF:</span>
                    <span className="text-base font-black font-mono text-amber-400 tracking-wider">
                      {subscribedData.subscriber.discountCodeGenerated}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={copyCoupon}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Email Marketing Personalizado por IA</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AI Email Marketing Template Preview Modal */}
      {isPreviewOpen && subscribedData && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Email Marketing con IA • Zavela Store
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Plantilla personalizada según tus intereses
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Canvas Preview */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs font-sans">
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono space-y-1">
                <div><strong className="text-slate-500">Asunto:</strong> {subscribedData.template.subject}</div>
                <div><strong className="text-slate-500">Para:</strong> {subscribedData.subscriber.email}</div>
                <div><strong className="text-slate-500">Preheader:</strong> {subscribedData.template.preheader}</div>
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-black text-slate-900">
                  {subscribedData.template.headline}
                </h4>
                <p className="text-slate-700 leading-relaxed">
                  {subscribedData.template.greeting} {subscribedData.template.bodyText}
                </p>
              </div>

              {/* Recommended Products */}
              <div className="space-y-2.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-indigo-700 block">
                  Recomendados para ti:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {subscribedData.template.recommendedProducts.map((p, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 inline-block">
                        {p.offerBadge}
                      </span>
                      <h5 className="font-bold text-slate-900">{p.name}</h5>
                      <p className="text-[11px] text-slate-500">{p.reason}</p>
                      <span className="text-xs font-black font-mono text-indigo-700 block pt-1">
                        {p.priceCOP}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon Highlight */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Tu código de descuento:</span>
                <span className="text-base font-black font-mono text-amber-700">
                  {subscribedData.template.couponCode}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 text-center leading-relaxed">
                {subscribedData.template.guaranteeText}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}
    </>
  );
};
