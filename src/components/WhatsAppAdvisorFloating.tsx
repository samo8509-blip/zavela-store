import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  ShoppingBag,
  RefreshCw,
  Zap,
  HelpCircle,
  Truck,
  Gift,
  Flame,
  Award,
  PhoneCall
} from 'lucide-react';
import { StoreSettings, Product } from '../types/index.ts';
import { getCurrentCustomer } from '../utils/customerAuthManager.ts';

interface WhatsAppAdvisorFloatingProps {
  whatsappNumber?: string;
  settings?: StoreSettings | null;
  onSelectProduct?: (product: Product) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  products?: Product[];
  whatsappUrl?: string;
  suggestedQuestions?: string[];
  timestamp: string;
}

// Preset interactive options for quick access
const PRESET_QUICK_OPTIONS = [
  { label: '🎁 Personal Shopper (Regalos)', query: '¡Hola Sofía! Ayúdame a encontrar el regalo ideal' },
  { label: '🔧 Bricolaje y Herramientas', query: 'Busco un regalo para alguien que le gusta el bricolaje y las herramientas' },
  { label: '🌸 Perfumes y Fragancias', query: '¿Tienen perfumes o fragancias para regalar?' },
  { label: '💎 Bolsos y Moda de Lujo', query: 'Busco un regalo elegante de moda para mujer' },
  { label: '🚚 Pago Contra Entrega', query: '¿Cómo funciona el Pago Contra Entrega en Colombia?' },
  { label: '🛍️ Tomar Pedido por Chat', query: 'Quiero tomar mi pedido por chat' },
  { label: '🔥 Más Vendidos', query: '¿Cuáles son los productos más vendidos hoy?' }
];

export const WhatsAppAdvisorFloating: React.FC<WhatsAppAdvisorFloatingProps> = ({
  whatsappNumber,
  settings,
  onSelectProduct
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'ai' | 'direct_whatsapp'>('ai');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resolution of Settings & Phone Number
  const isEnabled = settings?.whatsappSettings?.enabled ?? settings?.whatsappFloatingEnabled ?? true;
  const isAIEnabled = settings?.aiAgentSettings?.enabled ?? true;
  
  const rawTargetPhone = settings?.whatsappSettings?.phoneNumber || settings?.whatsappNumber || whatsappNumber || '573008784427';
  // Standardize Colombian phone number with prefix
  let cleanPhone = rawTargetPhone.replace(/[^\d]/g, '');
  if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
    cleanPhone = `57${cleanPhone}`;
  }
  if (!cleanPhone) cleanPhone = '573008784427';

  const advisorName = settings?.whatsappSettings?.advisorName || settings?.whatsappAdvisorName || 'Sofía - Asesora Experta en Regalos y Compras';
  const aiAgentName = settings?.aiAgentSettings?.agentName || 'Sofía';
  // Active Customer Session & Personalization Context
  const [currentCustomer, setCurrentCustomer] = useState(() => getCurrentCustomer());

  // Recently viewed products
  const [viewedProducts, setViewedProducts] = useState<string[]>(() => {
    try {
      const storedViews = localStorage.getItem('zavela_product_views');
      if (storedViews) {
        const parsed = JSON.parse(storedViews);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => p.title).filter(Boolean).slice(0, 3);
        }
      }
    } catch {}
    return [];
  });

  // Purchase history
  const [purchaseHistory, setPurchaseHistory] = useState<string>(() => {
    try {
      const storedOrders = localStorage.getItem('zavela_my_orders');
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return `${parsed.length} pedido(s) registrado(s)`;
        }
      }
    } catch {}
    return 'Sin compras registradas';
  });

  // Calculate Initial Personalized Greeting according to Section 2 of Sofía Guidelines
  const getInitialWelcomeMessage = (): string => {
    if (currentCustomer) {
      const name = currentCustomer.firstName || currentCustomer.name;
      if (viewedProducts.length > 0) {
        return `¡Hola ${name}! Qué alegría verte de nuevo en Zavela Store 😊. Noté que estuviste mirando ${viewedProducts[0]}. Es una excelente opción. ¿Te gustaría conocer más detalles o estás buscando un regalo para alguien especial?`;
      }
      return `¡Hola ${name}! Qué alegría verte de nuevo en Zavela Store 😊. ¿En qué te puedo asesorar hoy o buscas un detalle para alguna fecha especial?`;
    }
    return `¡Hola! 👋 Soy Sofía, tu asesora de compras en Zavela Store Colombia. Te ayudo a encontrar exactamente lo que necesitas o el regalo perfecto para esa persona especial. ¿Qué ocasión celebras hoy?`;
  };

  const customQuickQuestions = settings?.aiAgentSettings?.suggestQuickQuestions && settings.aiAgentSettings.suggestQuickQuestions.length > 0
    ? settings.aiAgentSettings.suggestQuickQuestions
    : [
        '🎁 Ayúdame a elegir un regalo especial',
        '🔧 Regalos para amantes del bricolaje y herramientas',
        '🌸 Perfumes y fragancias para regalar',
        '🚚 ¿Cómo funciona el Pago Contra Entrega en Colombia?',
        '🛍️ Quiero tomar mi pedido por chat'
      ];

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: getInitialWelcomeMessage(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Sync customer session and tracker on open
  useEffect(() => {
    if (isOpen) {
      const cust = getCurrentCustomer();
      setCurrentCustomer(cust);
      try {
        const storedViews = localStorage.getItem('zavela_product_views');
        if (storedViews) {
          const parsed = JSON.parse(storedViews);
          if (Array.isArray(parsed)) {
            setViewedProducts(parsed.map((p: any) => p.title).filter(Boolean).slice(0, 3));
          }
        }
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  if (!isEnabled) return null;

  const handleSendDirectWhatsApp = (customText?: string) => {
    const textToSend = customText || userQuery || settings?.whatsappSettings?.defaultMessage || '¡Hola! Quiero información y asesoría sobre un producto en Zavela Store.';
    const encoded = encodeURIComponent(textToSend);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    setUserQuery('');
  };

  const handleSendAIMessage = async (textToSend?: string) => {
    const query = textToSend || userQuery;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setUserQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          customerContext: {
            customerName: currentCustomer ? (currentCustomer.firstName || currentCustomer.name) : 'Invitado',
            isRegistered: Boolean(currentCustomer),
            viewedProducts,
            purchaseHistory
          },
          history: messages.slice(-6).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          })),
          previewSettings: {
            whatsappNumber: cleanPhone,
            whatsappSettings: {
              ...(settings?.whatsappSettings || {}),
              phoneNumber: cleanPhone,
              advisorName
            },
            aiAgentSettings: settings?.aiAgentSettings
          }
        })
      });

      const data = await res.json();

      if (data.success) {
        const agentMsg: ChatMessage = {
          id: `agt-${Date.now()}`,
          sender: 'agent',
          text: data.reply,
          products: data.recommendedProducts || [],
          whatsappUrl: data.whatsappUrl || `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola Asesor Zavela, quiero consultar sobre: ' + query.trim())}`,
          suggestedQuestions: data.suggestedQuestions || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, agentMsg]);
      } else {
        throw new Error(data.message || 'Error en la respuesta');
      }
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'agent',
        text: `¡Hola! Con el mayor gusto te atendemos de inmediato. Puedes chatear directamente con nuestro asesor humano oficial en WhatsApp al +${cleanPhone} para resolver todas tus dudas y tomar tu pedido con Pago Contra Entrega. 🇨🇴📦`,
        whatsappUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola, tengo una consulta sobre un producto en Zavela Store: ' + query)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMode === 'ai' && isAIEnabled) {
      handleSendAIMessage();
    } else {
      handleSendDirectWhatsApp();
    }
  };

  return (
    <div id="whatsapp-advisor-floating-root" className="fixed bottom-5 right-4 sm:right-6 z-40 pointer-events-auto">
      
      {/* Expanded Interactive Chat Bubble */}
      {isOpen && (
        <div 
          id="whatsapp-chat-bubble-card"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[420px] max-w-sm sm:max-w-md bg-white text-slate-900 rounded-3xl border-2 border-emerald-500 shadow-2xl overflow-hidden flex flex-col h-[540px] animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0A1128] via-[#1C2541] to-[#0A1128] text-white p-3.5 flex items-center justify-between border-b border-cyan-500/30">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                  {activeMode === 'ai' ? <Bot className="w-5 h-5 text-slate-950" /> : <MessageCircle className="w-5 h-5 text-slate-950" />}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0A1128] rounded-full animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 leading-tight">
                  <span>{activeMode === 'ai' ? aiAgentName : advisorName}</span>
                  {activeMode === 'ai' && (
                    <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                      IA Gemini
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>🟢 EN LÍNEA • +{cleanPhone}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {isAIEnabled && (
            <div className="bg-slate-100 p-1 flex items-center border-b border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveMode('ai')}
                className={`flex-1 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'ai'
                    ? 'bg-white text-cyan-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-cyan-600" />
                <span>Asesora Virtual 24/7</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('direct_whatsapp')}
                className={`flex-1 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'direct_whatsapp'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Directo</span>
              </button>
            </div>
          )}

          {/* Chat Body */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            
            {activeMode === 'ai' ? (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
                  >
                    <div
                      className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                        msg.sender === 'user'
                          ? 'bg-cyan-600 text-white rounded-br-none'
                          : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none font-medium'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      <span className={`text-[9px] block mt-1 text-right ${msg.sender === 'user' ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Render Recommended Products if available */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="w-full max-w-[95%] space-y-2 pt-1">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                          Productos Recomendados del Catálogo:
                        </span>
                        <div className="space-y-1.5">
                          {msg.products.map((prod) => (
                            <div
                              key={prod.id}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-cyan-400 transition-all flex items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                                  alt={prod.title}
                                  className="w-11 h-11 object-cover rounded-lg shrink-0 border border-slate-100"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <h6 className="font-extrabold text-xs text-slate-900 truncate">
                                    {prod.title}
                                  </h6>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="font-black text-xs text-emerald-700 font-mono">
                                      ${prod.price.toLocaleString('es-CO')} COP
                                    </span>
                                    {prod.discountPercentage > 0 && (
                                      <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1 py-0.2 rounded">
                                        -{prod.discountPercentage}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectProduct) {
                                    onSelectProduct(prod);
                                  }
                                  setIsOpen(false);
                                }}
                                className="bg-slate-900 hover:bg-cyan-600 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Ver</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* WhatsApp Direct Hand-off Button */}
                        <a
                          href={msg.whatsappUrl || `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hola Asesor Zavela, quiero consultar sobre un producto.')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[11px] font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-3.5 py-2 rounded-xl border border-emerald-300 transition-all w-full justify-center shadow-2xs"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>Continuar consulta en WhatsApp Oficial (+{cleanPhone})</span>
                        </a>
                      </div>
                    )}

                    {/* Suggested Next Questions under message */}
                    {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {msg.suggestedQuestions.map((sq, sidx) => (
                          <button
                            key={sidx}
                            type="button"
                            onClick={() => handleSendAIMessage(sq)}
                            className="text-[10px] font-semibold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            💡 {sq}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl w-fit border border-slate-200 shadow-2xs">
                    <RefreshCw className="w-4 h-4 text-cyan-600 animate-spin" />
                    <span>Consultando catálogo y preparando recomendación...</span>
                  </div>
                )}
              </>
            ) : (
              /* Direct WhatsApp Mode Body */
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-2xs space-y-2">
                  <p className="text-slate-800 leading-relaxed font-medium">
                    ¡Hola! 👋 Estás a un clic de chatear directamente con nuestro equipo de asesores oficiales por WhatsApp.
                  </p>
                  
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono text-emerald-700 uppercase font-bold">Línea Oficial Conectada:</div>
                      <div className="text-sm font-black tracking-tight">+{cleanPhone}</div>
                    </div>
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent('¡Hola Zavela Store! Quiero asesoría sobre los productos con Pago Contra Entrega.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <span className="text-[9px] font-mono text-slate-400 block text-right">
                    Horario: 8:00 AM - 8:00 PM • Despachos a toda Colombia
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                    Opciones prediseñadas para WhatsApp:
                  </span>
                  <div className="space-y-1">
                    {PRESET_QUICK_OPTIONS.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendDirectWhatsApp(opt.query)}
                        className="w-full text-left text-[11px] font-semibold text-slate-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between shadow-2xs"
                      >
                        <span>{opt.label}</span>
                        <Send className="w-3 h-3 text-emerald-600 shrink-0 ml-1" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Always accessible quick question pills in AI Mode */}
            {activeMode === 'ai' && (
              <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-600" />
                  <span>Opciones Prediseñadas:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_QUICK_OPTIONS.slice(0, 6).map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendAIMessage(opt.query)}
                      disabled={isLoading}
                      className="text-left text-[10.5px] font-semibold text-slate-700 bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-400 px-2.5 py-1 rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-2.5 bg-white border-t border-slate-200">
            <form onSubmit={handleFormSubmit} className="flex items-center gap-1.5">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder={
                  activeMode === 'ai'
                    ? 'Pregunta por un producto, regalo o promoción...'
                    : 'Escribe tu mensaje para WhatsApp...'
                }
                className="flex-1 px-3 py-2 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-xs rounded-xl border border-slate-300 focus:border-cyan-500 focus:bg-white outline-hidden"
              />
              <button
                type="submit"
                disabled={isLoading || !userQuery.trim()}
                className={`p-2 rounded-xl text-white font-bold transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-40 ${
                  activeMode === 'ai'
                    ? 'bg-cyan-600 hover:bg-cyan-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                title="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Footer Notice */}
          <div className="px-3.5 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[9.5px] text-slate-500 font-mono">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Garantía & Pago Contra Entrega
            </span>
            <span>🇨🇴 Colombia (+{cleanPhone})</span>
          </div>

        </div>
      )}

      {/* Main Floating Button */}
      <button
        id="btn-floating-whatsapp-advisor"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-3 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.45)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.6)] transition-all cursor-pointer active:scale-95"
      >
        <div className="relative">
          <MessageCircle className="w-6 h-6 fill-white text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-emerald-700 rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-emerald-700 rounded-full" />
        </div>

        <div className="text-left hidden sm:block">
          <div className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
            <span>🟢 EN LÍNEA AHORA</span>
          </div>
          <span className="text-xs font-black uppercase tracking-wide block">
            Asesor WhatsApp & IA
          </span>
        </div>
      </button>

    </div>
  );
};
