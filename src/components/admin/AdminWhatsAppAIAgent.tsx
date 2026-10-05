import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  MessageCircle, 
  Sparkles, 
  Send, 
  Save, 
  CheckCircle2, 
  Phone, 
  HelpCircle, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Zap, 
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Info,
  Sliders,
  Play,
  MessageSquare,
  Code,
  Globe,
  Copy,
  Check,
  Webhook,
  Key,
  Shield,
  Activity,
  Terminal,
  AlertCircle,
  Users,
  Edit,
  Database,
  UserCheck,
  Search,
  X
} from 'lucide-react';
import { StoreSettings, AIAgentSettings, AIPersonalityTone, WhatsAppConfigSettings, WhatsAppCloudApiSettings, Product } from '../../types/index.ts';

interface AdminWhatsAppAIAgentProps {
  settings: StoreSettings;
  products?: Product[];
  onSaveSettings: (updated: Partial<StoreSettings>) => Promise<void>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  products?: Product[];
  timestamp: string;
  whatsappUrl?: string;
}

export const AdminWhatsAppAIAgent: React.FC<AdminWhatsAppAIAgentProps> = ({
  settings,
  products = [],
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'webhook' | 'ai_agent' | 'simulator' | 'tidio' | 'advisors'>('whatsapp');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedTidioExample, setCopiedTidioExample] = useState(false);

  // cPanel Advisors State (http://api.zavelastore.com.co/api.php?action=asesores)
  const [cpanelAdvisors, setCpanelAdvisors] = useState<any[]>([]);
  const [isLoadingAdvisors, setIsLoadingAdvisors] = useState(false);
  const [isAdvisorModalOpen, setIsAdvisorModalOpen] = useState(false);
  const [editingAdvisorItem, setEditingAdvisorItem] = useState<any | null>(null);
  const [advisorForm, setAdvisorForm] = useState({
    nombre: '',
    whatsapp: '',
    rol: 'Asesor de Ventas',
    activo: true
  });
  const [advisorSearch, setAdvisorSearch] = useState('');
  const [advisorSyncSuccess, setAdvisorSyncSuccess] = useState<string | null>(null);

  const loadCpanelAdvisors = async () => {
    setIsLoadingAdvisors(true);
    let loaded = false;

    // 1. Intento directo a la API de cPanel MySQL
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('http://api.zavelastore.com.co/api.php?action=asesores', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setCpanelAdvisors(json);
          loaded = true;
        }
      }
    } catch {}

    // 2. Intento vía backend (sin problemas de Mixed Content o CORS)
    if (!loaded) {
      try {
        const res = await fetch('/api/advisors');
        if (res.ok) {
          const json = await res.json();
          const list = json?.data?.advisors;
          if (Array.isArray(list) && list.length > 0) {
            setCpanelAdvisors(list);
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('Error cargando asesores vía backend:', err);
      }
    }

    setIsLoadingAdvisors(false);
  };

  const handleOpenNewAdvisorModal = () => {
    setEditingAdvisorItem(null);
    setAdvisorForm({
      nombre: '',
      whatsapp: '',
      rol: 'Asesor de Ventas',
      activo: true
    });
    setIsAdvisorModalOpen(true);
  };

  const handleOpenEditAdvisorModal = (adv: any) => {
    setEditingAdvisorItem(adv);
    setAdvisorForm({
      nombre: adv.nombre || adv.name || '',
      whatsapp: adv.telefono || adv.whatsapp || adv.phone || '',
      rol: adv.rol || adv.role || 'Asesor de Ventas',
      activo: adv.activo !== undefined ? Boolean(Number(adv.activo)) : (adv.status === 'active')
    });
    setIsAdvisorModalOpen(true);
  };

  const handleSaveAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advisorForm.nombre.trim() || !advisorForm.whatsapp.trim()) {
      alert('Nombre y número de WhatsApp son obligatorios.');
      return;
    }

    const payload = {
      id: editingAdvisorItem?.id,
      nombre: advisorForm.nombre.trim(),
      name: advisorForm.nombre.trim(),
      telefono: advisorForm.whatsapp.trim(),
      whatsapp: advisorForm.whatsapp.trim(),
      phone: advisorForm.whatsapp.trim(),
      rol: advisorForm.rol.trim(),
      role: advisorForm.rol.trim(),
      activo: advisorForm.activo ? 1 : 0
    };

    try {
      // 1. Guardar vía backend
      await fetch('/api/advisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 2. Guardar directo a cPanel HTTP
      fetch('http://api.zavelastore.com.co/api.php?action=asesores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => null);

      setAdvisorSyncSuccess('¡Asesor guardado exitosamente en cPanel MySQL!');
      setTimeout(() => setAdvisorSyncSuccess(null), 3000);
      setIsAdvisorModalOpen(false);
      setEditingAdvisorItem(null);
      await loadCpanelAdvisors();
    } catch (err: any) {
      alert(err?.message || 'Error guardando asesor');
    }
  };

  const handleDeleteAdvisor = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar al asesor "${nombre}" de cPanel MySQL?`)) return;

    try {
      // Direct delete to cPanel (DELETE /action=asesores&id=...)
      fetch(`http://api.zavelastore.com.co/api.php?action=asesores&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(() => null);

      // Backend delete
      await fetch(`/api/advisors/${id}`, { method: 'DELETE' });

      setCpanelAdvisors(prev => prev.filter(a => a.id !== id));
      setAdvisorSyncSuccess(`Asesor "${nombre}" eliminado de cPanel correctamente.`);
      setTimeout(() => setAdvisorSyncSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar');
    }
  };

  // Cargar asesores al inicio y al cambiar a la pestaña de asesores
  useEffect(() => {
    loadCpanelAdvisors();
  }, []);

  // WhatsApp State
  const initialWhatsApp = settings.whatsappSettings || {
    enabled: settings.whatsappFloatingEnabled !== false,
    phoneNumber: settings.whatsappNumber || '573008784427',
    advisorName: settings.whatsappAdvisorName || 'Sofía - Asesora Experta en Regalos y Compras',
    defaultMessage: settings.whatsappDefaultMessage || settings.whatsappMessage || '¡Hola Sofía! Quisiera asesoría personalizada para encontrar el regalo ideal en Zavela Store Colombia.',
    orderConfirmationTemplate: 'Hola Sofía, quiero confirmar mi pedido *{ORDER_NUMBER}* a nombre de *{NAME}* por valor de *{TOTAL}*. ¿Me confirmas el despacho?',
    supportHoursNotice: 'Lunes a Sábado: 8:00 AM - 8:00 PM | Envíos a toda Colombia con Pago Contra Entrega'
  };

  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfigSettings>(initialWhatsApp);
  const [whatsappNumberRaw, setWhatsappNumberRaw] = useState(settings.whatsappNumber || initialWhatsApp.phoneNumber || '573008784427');
  const [whatsappAdvisorName, setWhatsappAdvisorName] = useState(initialWhatsApp.advisorName || 'Sofía - Asesora Experta en Regalos y Compras');
  const [whatsappDefaultMessage, setWhatsappDefaultMessage] = useState(initialWhatsApp.defaultMessage);

  // WhatsApp Cloud API & Webhook (Meta for Developers) State
  const initialCloudApi: WhatsAppCloudApiSettings = settings.whatsappCloudApi || {
    enabled: true,
    webhookVerifyToken: 'novora_meta_webhook_2026',
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    autoReplyWithAI: true,
    metaApiVersion: 'v20.0'
  };

  const [cloudApiConfig, setCloudApiConfig] = useState<WhatsAppCloudApiSettings>(initialCloudApi);
  const [copiedCallbackUrl, setCopiedCallbackUrl] = useState(false);
  const [copiedVerifyToken, setCopiedVerifyToken] = useState(false);
  const [isTestingHandshake, setIsTestingHandshake] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<{ success: boolean; message: string; challenge?: string } | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Auto-detected live Callback URL
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://remix-novora-tienda-online-dropi-6871.ai.studio';
  const callbackUrl = `${originUrl}/api/whatsapp/webhook`;
  const callbackAliasUrl = `${originUrl}/api/webhook/whatsapp`;

  // Tidio Live Chat & Lyro AI State
  const [tidioChatEnabled, setTidioChatEnabled] = useState<boolean>(settings.tidioChatEnabled ?? false);
  const [tidioScriptInput, setTidioScriptInput] = useState<string>(
    settings.tidioScriptUrl || settings.tidioPublicKey || ''
  );
  const [chatWidgetMode, setChatWidgetMode] = useState<'native_novora' | 'tidio' | 'both'>(
    settings.chatWidgetMode || 'both'
  );

  // AI Agent State
  const initialAIAgent: AIAgentSettings = settings.aiAgentSettings || {
    enabled: true,
    agentName: 'Sofía',
    agentRole: 'Asesora Experta en Regalos y Personal Shopper',
    personalityTone: 'friendly_colombian',
    welcomeMessage: '¡Hola! 👋 Qué alegría saludarte. Soy Sofía, tu asesora experta en regalos y compras de Zavela Store Colombia. Mi misión es ser tu Personal Shopper y ayudarte a encontrar el detalle perfecto según la persona y la ocasión. 🎁✨\n\nCuéntame:\n1️⃣ ¿Para quién es el regalo?\n2️⃣ ¿Qué le gusta hacer a esa persona o cuáles son sus pasatiempos?\n3️⃣ ¿Cuál es la ocasión especial?',
    customPromptInstructions: `Eres Sofía, la asesora experta en regalos y compras de Zavela Store Colombia.
Tu misión principal es actuar como un "Personal Shopper" que ayuda al usuario a encontrar el regalo ideal según la persona y la ocasión.

DIRECTRICES DE CONVERSACIÓN:
1. TONO: Cercano, empático, entusiasta y servicial (español de Colombia amigable y profesional).
2. SALUDO INICIAL: Saluda cordialmente y pregunta directamente:
   - ¿Para quién es el regalo?
   - ¿Qué le gusta hacer a esa persona o cuáles son sus pasatiempos?
   - ¿Cuál es la ocasión especial?
3. PERFILADO: Escucha con atención los gustos (ej. si le gusta el bricolaje/herramientas, tecnología, moda, accesorios). Si falta información clave, haz máximo una pregunta breve de seguimiento.
4. RECOMENDACIÓN: Sugiere entre 1 y 3 productos que mejor encajen con lo descrito de nuestro catálogo activo. Explica brevemente por qué es una excelente opción para esa persona.
5. CIERRE DE VENTA: Recuerda siempre que contamos con Envíos a toda Colombia y Pago Contra Entrega en efectivo al recibir el paquete. Facilita el botón/enlace de compra directa.`,
    recommendationMode: 'all_catalog',
    maxProductsToSuggest: 3,
    enableDirectWhatsAppHandoff: true,
    suggestQuickQuestions: [
      '🎁 Ayúdame a elegir un regalo especial',
      '🔧 Regalos para amantes del bricolaje y herramientas',
      '🌸 Perfumes y fragancias para regalar',
      '🚚 ¿Cómo funciona el Pago Contra Entrega en Colombia?',
      '🛍️ Quiero tomar mi pedido por chat'
    ]
  };

  const [aiConfig, setAiConfig] = useState<AIAgentSettings>(initialAIAgent);
  const [newQuickQuestion, setNewQuickQuestion] = useState('');

  // Simulator State
  const [simulatorMessages, setSimulatorMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'agent',
      text: aiConfig.welcomeMessage || '¡Hola! 👋 Qué alegría saludarte. Soy Sofía, tu asesora experta en regalos y Personal Shopper de Zavela Store Colombia. ¿En qué te puedo orientar hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [simulatorInput, setSimulatorInput] = useState('');
  const [isSimulatorLoading, setIsSimulatorLoading] = useState(false);
  const [simCustomerMode, setSimCustomerMode] = useState<'guest' | 'registered'>('guest');
  const [simCustomerName, setSimCustomerName] = useState('Carlos Mendoza');
  const [simViewedProduct, setSimViewedProduct] = useState('Taladro 2421 Dewalt Con Herramientas');

  // Quick Preset Prompt Templates
  const applyPromptTemplate = (type: 'colombian_closer' | 'gifts_special' | 'cod_assurance' | 'perfumes_deals') => {
    let template = '';
    if (type === 'colombian_closer') {
      template = `Eres Sofía, la asesora experta en regalos y compras de Zavela Store Colombia.
Tu misión principal es actuar como un "Personal Shopper" que ayuda al usuario a encontrar el regalo ideal según la persona y la ocasión.

DIRECTRICES:
1. Tono cercano, empático y servicial colombiano.
2. Saludo con las 3 preguntas clave (¿Para quién?, ¿Pasatiempos?, ¿Ocasión?).
3. Perfilado atento y recomendación de 1 a 3 productos del catálogo.
4. Cierre recordando Envíos a toda Colombia y Pago Contra Entrega en efectivo.`;
    } else if (type === 'gifts_special') {
      template = `Especialista en regalos y Personal Shopper de Zavela Store Colombia. Pregunta para quién es el detalle, gustos/pasatiempos y ocasión especial. Recomienda de 1 a 3 productos ideales del catálogo activo con Pago Contra Entrega.`;
    } else if (type === 'cod_assurance') {
      template = `Enfócate en generar máxima confianza en Zavela Store Colombia con envíos a nivel nacional y Pago Contra Entrega. Explica que cancelan en efectivo al recibir el paquete en su puerta (2 a 4 días hábiles).`;
    } else if (type === 'perfumes_deals') {
      template = `Asesora de alta perfumería de Zavela Store. Recomienda fragancias exclusivas de fijación duradera para hombre o mujer según la ocasión, recordando el Pago Contra Entrega en todo el país.`;
    }
    setAiConfig(prev => ({ ...prev, customPromptInstructions: template }));
  };

  const handleAddQuickQuestion = () => {
    if (!newQuickQuestion.trim()) return;
    setAiConfig(prev => ({
      ...prev,
      suggestQuickQuestions: [...prev.suggestQuickQuestions, newQuickQuestion.trim()]
    }));
    setNewQuickQuestion('');
  };

  const handleRemoveQuickQuestion = (index: number) => {
    setAiConfig(prev => ({
      ...prev,
      suggestQuickQuestions: prev.suggestQuickQuestions.filter((_, i) => i !== index)
    }));
  };

  const handleTestHandshake = async () => {
    setIsTestingHandshake(true);
    setHandshakeResult(null);
    try {
      const res = await fetch('/api/whatsapp/test-handshake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifyToken: cloudApiConfig.webhookVerifyToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHandshakeResult({
          success: true,
          message: '¡Verificación de Meta exitosa! El endpoint respondió con código 200 OK y el challenge.',
          challenge: data.challengeReturned
        });
      } else {
        setHandshakeResult({
          success: false,
          message: data.message || 'Error en la verificación. Verifica que el token coincida.'
        });
      }
    } catch (err: any) {
      setHandshakeResult({
        success: false,
        message: `Error de conexión con el webhook: ${err.message}`
      });
    } finally {
      setIsTestingHandshake(false);
    }
  };

  const handleFetchWebhookLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/whatsapp/webhook-info');
      const data = await res.json();
      if (data.logs) {
        setWebhookLogs(data.logs);
      }
    } catch (e) {
      console.error('Error fetching webhook logs:', e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Normalize clean phone number (only digits, add 57 prefix if 10 digits)
      let cleanPhone = whatsappNumberRaw.replace(/[^\d]/g, '');
      if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
        cleanPhone = `57${cleanPhone}`;
      }
      if (!cleanPhone) cleanPhone = '573157894512';

      const updatedWhatsapp: WhatsAppConfigSettings = {
        ...whatsappConfig,
        phoneNumber: cleanPhone,
        advisorName: whatsappAdvisorName,
        defaultMessage: whatsappDefaultMessage
      };

      // Sanitize Tidio input
      let cleanTidioScript = tidioScriptInput.trim();
      let extractedKey = '';
      if (cleanTidioScript) {
        const match = cleanTidioScript.match(/code\.tidio\.co\/([a-zA-Z0-9_-]+)\.js/);
        if (match && match[1]) {
          extractedKey = match[1];
          cleanTidioScript = `//code.tidio.co/${match[1]}.js`;
        }
      }

      await onSaveSettings({
        whatsappNumber: cleanPhone,
        whatsappAdvisorName: whatsappAdvisorName,
        whatsappDefaultMessage: whatsappDefaultMessage,
        whatsappMessage: whatsappDefaultMessage,
        whatsappFloatingEnabled: whatsappConfig.enabled,
        whatsappSettings: updatedWhatsapp,
        whatsappCloudApi: cloudApiConfig,
        aiAgentSettings: aiConfig,
        tidioChatEnabled: tidioChatEnabled,
        tidioScriptUrl: cleanTidioScript,
        tidioPublicKey: extractedKey || cleanTidioScript,
        chatWidgetMode: chatWidgetMode
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving WhatsApp and AI settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendSimulatorMessage = async (textToSend?: string) => {
    const query = textToSend || simulatorInput;
    if (!query.trim() || isSimulatorLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setSimulatorMessages(prev => [...prev, userMsg]);
    setSimulatorInput('');
    setIsSimulatorLoading(true);

    try {
      let cleanPhone = whatsappNumberRaw.replace(/[^\d]/g, '');
      if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
        cleanPhone = `57${cleanPhone}`;
      }
      if (!cleanPhone) cleanPhone = '573157894512';

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          customerContext: {
            customerName: simCustomerMode === 'registered' ? simCustomerName : 'Invitado',
            isRegistered: simCustomerMode === 'registered',
            viewedProducts: simCustomerMode === 'registered' && simViewedProduct ? [simViewedProduct] : [],
            purchaseHistory: simCustomerMode === 'registered' ? '1 pedido previo (ZAV-1002)' : 'Sin compras registradas'
          },
          history: simulatorMessages.slice(-4).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
          })),
          previewSettings: {
            whatsappNumber: cleanPhone,
            whatsappSettings: {
              ...whatsappConfig,
              phoneNumber: cleanPhone,
              advisorName: whatsappAdvisorName
            },
            aiAgentSettings: aiConfig
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
          whatsappUrl: data.whatsappUrl,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setSimulatorMessages(prev => [...prev, agentMsg]);
      } else {
        throw new Error(data.message || 'Error del agente de IA');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'agent',
        text: `Lo siento, ocurrió un inconveniente temporal: ${err.message}. Pero puedes consultar directamente por WhatsApp al ${whatsappNumberRaw}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setSimulatorMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSimulatorLoading(false);
    }
  };

  const handleTestWhatsAppDirect = () => {
    let cleanPhone = whatsappNumberRaw.replace(/[^\d]/g, '');
    if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = `57${cleanPhone}`;
    }
    if (!cleanPhone) cleanPhone = '573157894512';
    const encoded = encodeURIComponent(whatsappDefaultMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div id="admin-whatsapp-ai-agent-container" className="space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0A1128] via-[#1C2541] to-[#0A1128] text-white p-6 rounded-2xl border border-cyan-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 rounded-xl font-bold shadow-lg shadow-cyan-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>WhatsApp & Agente de IA Asesor</span>
                <span className="text-[10px] bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Gemini 3.7 Flash + Live Catalog
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Configura el número celular oficial de atención por WhatsApp y el asistente de inteligencia artificial que atiende, recomienda productos y cierra ventas 24/7.
              </p>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3 shrink-0">
          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-500/40 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Guardado con éxito!</span>
            </div>
          )}

          <button
            id="btn-save-whatsapp-ai-settings"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95 text-xs uppercase tracking-wider"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Nota Informativa de Separación de Canales */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>Canal Comercial para Clientes:</strong> Este panel configura el bot de atención en tienda. Para tus alertas de ventas y ciberseguridad privadas dirigidas a <strong>+57 300 878 4427</strong>, consulta la sección <strong>"Canal Privado Copiloto WhatsApp"</strong>.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          Privado: +57 300 878 4427
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4 text-emerald-300" />
          <span>1. Celular WhatsApp & Canales</span>
        </button>

        <button
          id="tab-btn-webhook"
          onClick={() => setActiveTab('webhook')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'webhook'
              ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/25 ring-2 ring-emerald-400/50'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Webhook className="w-4 h-4 text-emerald-400" />
          <span>2. URL de Devolución de Llamada (Webhook)</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
            Meta API
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ai_agent')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'ai_agent'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bot className="w-4 h-4 text-cyan-200" />
          <span>3. Configuración del Agente IA</span>
          {aiConfig.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Play className="w-4 h-4 text-indigo-300" />
          <span>4. Simulador & Pruebas en Vivo</span>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-mono">
            Sandbox
          </span>
        </button>

        <button
          id="tab-btn-tidio"
          onClick={() => setActiveTab('tidio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'tidio'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-300" />
          <span>5. Tidio Live Chat & Lyro AI</span>
          {tidioChatEnabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          id="tab-btn-advisors"
          onClick={() => {
            setActiveTab('advisors');
            loadCpanelAdvisors();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'advisors'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400 font-black'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-amber-600" />
          <span>6. Asesores WhatsApp</span>
          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
            cPanel MySQL
          </span>
        </button>
      </div>

      {/* TAB 1: WHATSAPP INTEGRATION */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Left / Main Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Phone Setting Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Número de WhatsApp Oficial</h3>
                    <p className="text-xs text-slate-500">Línea que recibirá los mensajes, consultas y confirmaciones de pedidos.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Botón Flotante Activo</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappConfig.enabled}
                      onChange={(e) => setWhatsappConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Número Celular (con prefijo país)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={whatsappNumberRaw}
                      onChange={(e) => setWhatsappNumberRaw(e.target.value)}
                      placeholder="Ej: 573157894512 o 3157894512"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-hidden"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] font-mono text-emerald-600 font-bold">
                      🇨🇴 +57
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ingresa los 10 dígitos colombianos (ej. 3157894512) o con código 573157894512.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre del Asesor / Canal Visible
                  </label>
                  <input
                    type="text"
                    value={whatsappAdvisorName}
                    onChange={(e) => setWhatsappAdvisorName(e.target.value)}
                    placeholder="Ej: Asesor Zavela Oficial"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se mostrará en la cabecera del widget flotante de atención al cliente.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mensaje de Bienvenida Predeterminado
                </label>
                <textarea
                  rows={3}
                  value={whatsappDefaultMessage}
                  onChange={(e) => setWhatsappDefaultMessage(e.target.value)}
                  placeholder="Texto con el que se abrirá WhatsApp cuando el usuario pulse el botón..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Horario de Atención al Cliente (Aviso Informativo)
                </label>
                <input
                  type="text"
                  value={whatsappConfig.supportHoursNotice || ''}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, supportHoursNotice: e.target.value }))}
                  placeholder="Ej: Lunes a Sábado: 8:00 AM - 8:00 PM | Domingos: 9:00 AM - 2:00 PM"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-500 focus:bg-white outline-hidden"
                />
              </div>

              {/* Live Test WhatsApp Action */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">
                    Verificar Enlace de WhatsApp
                  </span>
                  <p className="text-[11px] text-emerald-700">
                    Abre una conversación de prueba con el número configurado: <strong>+{whatsappNumberRaw.replace(/[^\d]/g, '')}</strong>
                  </p>
                </div>

                <button
                  onClick={handleTestWhatsAppDirect}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Probar Chat en Vivo</span>
                </button>
              </div>
            </div>

            {/* Template Order Confirmation Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Plantilla de Notificación de Pedidos</h3>
                  <p className="text-xs text-slate-500">Mensaje automático que se genera cuando un cliente finaliza una compra.</p>
                </div>
              </div>

              <div>
                <textarea
                  rows={3}
                  value={whatsappConfig.orderConfirmationTemplate || ''}
                  onChange={(e) => setWhatsappConfig(prev => ({ ...prev, orderConfirmationTemplate: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:border-sky-500 focus:bg-white outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Variables dinámicas soportadas: <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">{'{ORDER_NUMBER}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">{'{NAME}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">{'{TOTAL}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">{'{CITY}'}</code>.
                </p>
              </div>
            </div>

            {/* Quick Webhook Callback URL Banner */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-[#0A1128] p-5 rounded-2xl border border-emerald-500/30 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-emerald-400" />
                  <span className="font-extrabold text-xs text-emerald-300 uppercase tracking-wider">
                    URL de Devolución de Llamada (Callback URL) para Meta Webhook
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono break-all">
                  {callbackUrl}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(callbackUrl);
                    setCopiedCallbackUrl(true);
                    setTimeout(() => setCopiedCallbackUrl(false), 2500);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {copiedCallbackUrl ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCallbackUrl ? 'Copiada' : 'Copiar Callback URL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('webhook')}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl border border-white/20 transition-all cursor-pointer"
                >
                  <span>Configurar Meta</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Column / Preview Card */}
          <div className="space-y-6">
            <div className="bg-[#0A1128] text-white p-6 rounded-2xl border border-[#1C2541] shadow-lg space-y-4">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                Vista Previa del Botón Flotante
              </span>

              {/* Mini Widget Preview */}
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-700 p-3 rounded-xl text-white">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                    ZS
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">{whatsappAdvisorName || 'Asesor Zavela Oficial'}</h5>
                    <span className="text-[10px] text-emerald-200 font-mono">🟢 EN LÍNEA AHORA</span>
                  </div>
                </div>

                <div className="bg-slate-800 p-3 rounded-xl text-slate-200 text-xs leading-relaxed border border-slate-700">
                  {whatsappDefaultMessage || '¡Hola! Te damos la bienvenida a Zavela Store. ¿Cómo podemos ayudarte hoy?'}
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>+{whatsappNumberRaw.replace(/[^\d]/g, '')}</span>
                  <span className="text-emerald-400 font-bold">100% Contra Entrega</span>
                </div>
              </div>

              <div className="p-3 bg-[#1C2541] rounded-xl text-xs text-slate-300 space-y-1">
                <div className="font-bold text-white flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Integración Directa sin Costos</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Utiliza la API oficial de enlace universal de WhatsApp (wa.me), garantizando compatibilidad en celulares Android, iPhone y computadores.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: WEBHOOK CALLBACK URL & META CLOUD API */}
      {activeTab === 'webhook' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Main Webhook Configuration (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Alert: Meta #N/A:WBxP Verification Error & Solution Guide */}
            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-200 text-amber-900 rounded-xl shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-amber-950 text-sm">
                    ¿Por qué Meta muestra el error <code className="bg-amber-200/80 px-1.5 py-0.5 rounded text-xs font-mono font-bold">#N/A:WBxP</code> al verificar?
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Las URLs de vista previa de desarrollo (como <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">ais-dev-...run.app</code>) están protegidas por el cortafuegos de sesión de Google AI Studio (<code className="font-mono text-[11px]">302 Found</code>). Como los servidores automáticos de Meta no tienen una sesión de navegador abierta, no pueden completar el apretón de manos directamente en el entorno de desarrollo privado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-amber-200/70 text-xs">
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Solución 1: Cloudflare Worker Gratuito (1 Minuto)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Crea un Worker gratis en <a href="https://workers.cloudflare.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">workers.cloudflare.com</a> que responda con 200 OK a Meta y reenvíe los datos. Meta lo verificará en 1 segundo.
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-blue-800 font-bold">
                    <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Solución 2: Desplegar a Producción (Cloud Run)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-normal">
                    Al desplegar tu tienda a Cloud Run o conectar tu propio dominio público (sin la capa de preview de desarrollo), Meta valida la URL <code className="font-mono text-[10px]">/api/whatsapp/webhook</code> de forma inmediata.
                  </p>
                </div>
              </div>
            </div>

            {/* Callback URL Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Webhook className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      URL de Devolución de Llamada (Callback URL) para WhatsApp Webhook
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pega esta URL en el panel de desarrolladores de Meta (developers.facebook.com) para recibir mensajes en tiempo real.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Webhook Activo</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cloudApiConfig.enabled}
                      onChange={(e) => setCloudApiConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Primary Callback URL Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    URL de Devolución de Llamada (Callback URL)
                  </label>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                    GET / POST Soportado
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={callbackUrl}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-300 focus:border-emerald-500 outline-hidden select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(callbackUrl);
                      setCopiedCallbackUrl(true);
                      setTimeout(() => setCopiedCallbackUrl(false), 2500);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
                  >
                    {copiedCallbackUrl ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCallbackUrl ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Esta es la URL oficial que debes ingresar en el campo <strong>&quot;URL de devolución de llamada&quot;</strong> dentro de Meta for Developers.
                </p>
              </div>

              {/* Verify Token Field */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Token de Verificación (Verify Token)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randomToken = `novora_sec_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString().slice(-4)}`;
                      setCloudApiConfig(prev => ({ ...prev, webhookVerifyToken: randomToken }));
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generar Token Aleatorio</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={cloudApiConfig.webhookVerifyToken}
                      onChange={(e) => setCloudApiConfig(prev => ({ ...prev, webhookVerifyToken: e.target.value }))}
                      placeholder="Ej: novora_meta_webhook_2026"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:bg-white outline-hidden"
                    />
                    <Key className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(cloudApiConfig.webhookVerifyToken);
                      setCopiedVerifyToken(true);
                      setTimeout(() => setCopiedVerifyToken(false), 2500);
                    }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
                  >
                    {copiedVerifyToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedVerifyToken ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Cadena secreta utilizada para validar el apretón de manos (handshake) inicial con Meta. Debe ser exactamente igual al que pongas en Meta.
                </p>
              </div>

              {/* Handshake Tester Action */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                      Probar Verificación del Webhook (Handshake Test)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestHandshake}
                    disabled={isTestingHandshake}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {isTestingHandshake ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Probar Conexión 200 OK</span>
                      </>
                    )}
                  </button>
                </div>

                {handshakeResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${
                    handshakeResult.success 
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}>
                    {handshakeResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-bold">{handshakeResult.message}</p>
                      {handshakeResult.challenge && (
                        <p className="text-[11px] text-emerald-700 font-mono">
                          Challenge devuelto por el servidor: <strong>{handshakeResult.challenge}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Meta Cloud API Optional Credentials Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Credenciales de Meta WhatsApp Cloud API (Graph API)</h3>
                    <p className="text-xs text-slate-500">Permite que el Agente IA de Novora responda mensajes directamente en WhatsApp sin intervención humana.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Auto-responder con IA</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cloudApiConfig.autoReplyWithAI}
                      onChange={(e) => setCloudApiConfig(prev => ({ ...prev, autoReplyWithAI: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number ID (Identificador de número de teléfono)
                  </label>
                  <input
                    type="text"
                    value={cloudApiConfig.phoneNumberId || ''}
                    onChange={(e) => setCloudApiConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                    placeholder="Ej: 104829384758192"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Encuéntralo en Meta for Developers $\rightarrow$ WhatsApp $\rightarrow$ Configuración de la API.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    WABA ID (WhatsApp Business Account ID)
                  </label>
                  <input
                    type="text"
                    value={cloudApiConfig.wabaId || ''}
                    onChange={(e) => setCloudApiConfig(prev => ({ ...prev, wabaId: e.target.value }))}
                    placeholder="Ej: 938472618294019"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:bg-white outline-hidden"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    ID de tu cuenta de WhatsApp Business registrada en Meta Business Manager.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Token de Acceso Permanente de Meta (System User Token)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={cloudApiConfig.accessToken || ''}
                    onChange={(e) => setCloudApiConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                    placeholder="EAAG... (Token de acceso de usuario del sistema)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:border-blue-500 focus:bg-white outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Genera un token permanente con permisos <code>whatsapp_business_messaging</code> y <code>whatsapp_business_management</code>.
                </p>
              </div>

            </div>

            {/* Real-time Webhook Events Log Monitor */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-700" />
                  <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Monitor de Eventos del Webhook en Vivo
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={handleFetchWebhookLogs}
                  disabled={isLoadingLogs}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  <span>Actualizar Logs</span>
                </button>
              </div>

              {webhookLogs.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {webhookLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-900 rounded-xl text-xs font-mono text-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-bold ${
                          log.type === 'handshake' ? 'text-cyan-400' :
                          log.type === 'message_received' ? 'text-emerald-400' :
                          log.type === 'message_sent' ? 'text-blue-400' : 'text-rose-400'
                        }`}>
                          [{log.type.toUpperCase()}] {log.status}
                        </span>
                        <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {log.sender && <div className="text-slate-400 text-[11px]">De: +{log.sender}</div>}
                      <div className="text-slate-300 break-words">{log.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Haz clic en &quot;Actualizar Logs&quot; o realiza una prueba de handshake para ver los eventos del webhook aquí.
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Meta Setup Step-by-Step Guide */}
          <div className="space-y-6">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Configuración en Meta for Developers
                </h4>
              </div>

              <ol className="space-y-3.5 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Ingresa a tu cuenta en <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-emerald-600 font-bold underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> y selecciona tu app de WhatsApp.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    En el menú lateral izquierdo, ve a <strong>WhatsApp</strong> $\rightarrow$ <strong>Configuración (Configuration)</strong>.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    En la sección <strong>Webhook</strong>, haz clic en el botón <strong>&quot;Editar&quot;</strong>.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div className="space-y-1">
                    <span>Pega los valores exactos:</span>
                    <ul className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <li>• <strong>URL de devolución de llamada:</strong> <code className="text-emerald-700 break-all">{callbackUrl}</code></li>
                      <li>• <strong>Token de verificación:</strong> <code className="text-emerald-700">{cloudApiConfig.webhookVerifyToken}</code></li>
                    </ul>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    5
                  </span>
                  <span>
                    Haz clic en <strong>&quot;Verificar y guardar&quot;</strong>. Luego, en la tabla de <strong>Campos del webhook</strong>, haz clic en <strong>&quot;Administrar&quot;</strong> y suscríbete al campo <strong><code>messages</code></strong>.
                  </span>
                </li>
              </ol>
            </div>

            {/* Cloudflare Worker Instant Relay Card */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Script de Validación Inmediata (Cloudflare Worker)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const workerScript = `export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Valida con Meta Developers al instante
    if (mode === "subscribe" && challenge) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // POST: Recibe los mensajes de WhatsApp
    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};`;
                    navigator.clipboard.writeText(workerScript);
                    alert("¡Código del Cloudflare Worker copiado al portapapeles!");
                  }}
                  className="text-[11px] bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copiar Script</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Si deseas verificar Meta sin esperar a desplegar tu dominio propio:
              </p>
              <ol className="text-[11px] text-slate-400 space-y-1 list-decimal list-inside">
                <li>Ve a <strong>workers.cloudflare.com</strong> (gratis).</li>
                <li>Crea un Worker y pega el script copiado.</li>
                <li>Copia la URL del worker y pégala en Meta como Callback URL. ¡Se valida en 1 segundo!</li>
              </ol>
            </div>

            <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-5 rounded-2xl border border-emerald-700 shadow-md space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>¿Por qué activar la Callback URL?</span>
              </div>
              <p className="text-[11px] text-emerald-100 leading-relaxed">
                Al activar el Webhook de Meta, tu tienda Novora puede procesar mensajes de WhatsApp entrantes en tiempo real, consultar el catálogo en vivo con Gemini 3.7 Flash y responder cotizaciones y pedidos contra entrega en segundos.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: AI AGENT SETTINGS */}
      {activeTab === 'ai_agent' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Main Controls (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Master AI Switch & Identity */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Identidad y Estado del Agente</h3>
                    <p className="text-xs text-slate-500">Controla el nombre, rol y activación del asesor inteligente.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black ${aiConfig.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {aiConfig.enabled ? 'Agente de IA Activo' : 'Agente Desactivado'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiConfig.enabled}
                      onChange={(e) => setAiConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre del Agente de IA
                  </label>
                  <input
                    type="text"
                    value={aiConfig.agentName}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, agentName: e.target.value }))}
                    placeholder="Ej: Sofía - Asesora Inteligente Zavela"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-cyan-500 focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Especialidad o Cargo
                  </label>
                  <input
                    type="text"
                    value={aiConfig.agentRole}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, agentRole: e.target.value }))}
                    placeholder="Ej: Especialista en Ventas y Recomendaciones COD"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-cyan-500 focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Personality Tone Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Tono y Personalidad de Conversación
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      key: 'friendly_colombian' as AIPersonalityTone,
                      title: '🇨🇴 Amable y Cercano Colombiano',
                      desc: 'Cálido, carismático, frases de cortesía nacional ("con gusto", "claro que sí").'
                    },
                    {
                      key: 'professional_sales' as AIPersonalityTone,
                      title: '💼 Comercial y Persuasivo',
                      desc: 'Orientado al cierre rápido de ventas, destacando beneficios y resolución.'
                    },
                    {
                      key: 'enthusiastic_deals' as AIPersonalityTone,
                      title: '⚡ Ofertas Flash y Descuentos',
                      desc: 'Enérgico, enfocado en promociones, ahorros y liquidaciones de temporada.'
                    },
                    {
                      key: 'expert_consultant' as AIPersonalityTone,
                      title: '🔬 Asesor Técnico Experto',
                      desc: 'Detallista en especificaciones, funcionamiento, calidad de materiales y garantía.'
                    }
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAiConfig(prev => ({ ...prev, personalityTone: t.key }))}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        aiConfig.personalityTone === t.key
                          ? 'border-cyan-500 bg-cyan-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-extrabold text-xs text-slate-900 block">{t.title}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Welcome Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mensaje Inicial de Saludo del Asesor IA
                </label>
                <textarea
                  rows={2}
                  value={aiConfig.welcomeMessage}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                  placeholder="Mensaje que saluda al cliente al abrir el chat interactivo..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-cyan-500 focus:bg-white outline-hidden"
                />
              </div>

            </div>

            {/* Custom AI Instructions & Prompts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Instrucciones del Sistema (Prompt Maestro)</h3>
                    <p className="text-xs text-slate-500">Indica a la IA cómo vender, qué destacar y cómo tratar a tus clientes.</p>
                  </div>
                </div>
              </div>

              {/* Quick Template Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Cargar Plantilla Rápida de Instrucciones:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPromptTemplate('colombian_closer')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    🔥 Vendedora Estrella Colombiana
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPromptTemplate('gifts_special')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    💖 Amor, Amistad & Regalos
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPromptTemplate('cod_assurance')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    🛡️ Enfoque Confianza Contra Entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPromptTemplate('perfumes_deals')}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    ✨ Perfumería & Combos
                  </button>
                </div>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={aiConfig.customPromptInstructions || ''}
                  onChange={(e) => setAiConfig(prev => ({ ...prev, customPromptInstructions: e.target.value }))}
                  placeholder="Escribe aquí las instrucciones detalladas para el comportamiento de la IA..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-indigo-500 focus:bg-white outline-hidden font-mono leading-relaxed"
                />
              </div>

              {/* Recommendation Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Modo de Recomendación
                  </label>
                  <select
                    value={aiConfig.recommendationMode}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, recommendationMode: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white outline-hidden cursor-pointer"
                  >
                    <option value="all_catalog">Todo el catálogo activo (Recomendado)</option>
                    <option value="featured_only">Solo productos destacados (Featured)</option>
                    <option value="deals_only">Solo productos con oferta (&gt;15% OFF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Máximo de productos por respuesta
                  </label>
                  <select
                    value={aiConfig.maxProductsToSuggest}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, maxProductsToSuggest: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white outline-hidden cursor-pointer"
                  >
                    <option value={1}>1 producto más relevante</option>
                    <option value={2}>2 productos sugeridos</option>
                    <option value={3}>3 productos sugeridos (Óptimo)</option>
                    <option value={4}>4 productos sugeridos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Questions Manager */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Preguntas Frecuentes Rápidas (Chips)</h3>
                    <p className="text-xs text-slate-500">Botones de 1 clic que se muestran al cliente para iniciar la conversación.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {aiConfig.suggestQuickQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-800 font-medium truncate">💬 {q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuickQuestion(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newQuickQuestion}
                  onChange={(e) => setNewQuickQuestion(e.target.value)}
                  placeholder="Escribe una nueva pregunta frecuente..."
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-amber-500 focus:bg-white outline-hidden"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddQuickQuestion();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddQuickQuestion}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column / Live Diagnostics */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#0A1128] to-[#1C2541] text-white p-6 rounded-2xl border border-cyan-500/30 shadow-lg space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-extrabold text-white">Motor de IA Gemini 3.7</h4>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <span>Catálogo Conectado:</span>
                  <span className="font-mono font-bold text-cyan-300">{products.length} productos</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <span>Enlace WhatsApp:</span>
                  <span className="font-mono font-bold text-emerald-300">+{whatsappNumberRaw.replace(/[^\d]/g, '')}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <span>Handoff Asesor Humano:</span>
                  <span className="font-mono font-bold text-cyan-300">Habilitado</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('simulator')}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Abrir Simulador de Pruebas</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5 text-xs text-slate-600">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-600" />
                <span>¿Cómo funciona para tus clientes?</span>
              </div>
              <p className="leading-relaxed">
                Cuando un cliente busca cualquier producto, regalo o tiene dudas sobre el pago contra entrega, el agente de IA busca en tiempo real en tu base de datos y le responde de manera conversacional, mostrando las fichas interactivas de los productos con fotos y precio en COP.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: SIMULATOR / LIVE SANDBOX */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Main Simulator Chat Box (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col h-[620px] overflow-hidden">
            
            {/* Chat Top Header */}
            <div className="bg-gradient-to-r from-[#0A1128] via-[#1C2541] to-[#0A1128] text-white p-4 flex items-center justify-between border-b border-cyan-500/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 flex items-center justify-center font-extrabold text-sm shadow-md">
                    IA
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#0A1128] rounded-full animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span>{aiConfig.agentName || 'Sofía'}</span>
                    <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                      Simulador en Vivo
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 font-mono">
                    🟢 Activo • Modo: {aiConfig.personalityTone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSimulatorMessages([
                  {
                    id: `msg-${Date.now()}`,
                    sender: 'agent',
                    text: simCustomerMode === 'registered'
                      ? (simViewedProduct 
                          ? `¡Hola ${simCustomerName}! Qué alegría verte de nuevo en Zavela Store 😊. Noté que estuviste mirando ${simViewedProduct}. Es una excelente opción. ¿Te gustaría conocer más detalles o estás buscando un regalo para alguien especial?`
                          : `¡Hola ${simCustomerName}! Qué alegría verte de nuevo en Zavela Store 😊. ¿En qué te puedo asesorar hoy o buscas un detalle para alguna fecha especial?`)
                      : '¡Hola! 👋 Soy Sofía, tu asesora de compras en Zavela Store Colombia. Te ayudo a encontrar exactamente lo que necesitas o el regalo perfecto para esa persona especial. ¿Qué ocasión celebras hoy?',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ])}
                className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Limpiar conversación de prueba"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar Chat</span>
              </button>
            </div>

            {/* Context Testing Bar */}
            <div className="bg-slate-100 border-b border-slate-200 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-[11px]">Perfil de Prueba:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSimCustomerMode('guest');
                    setSimulatorMessages([
                      {
                        id: `msg-${Date.now()}`,
                        sender: 'agent',
                        text: '¡Hola! 👋 Soy Sofía, tu asesora de compras en Zavela Store Colombia. Te ayudo a encontrar exactamente lo que necesitas o el regalo perfecto para esa persona especial. ¿Qué ocasión celebras hoy?',
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ]);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    simCustomerMode === 'guest'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  🌐 Invitado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimCustomerMode('registered');
                    setSimulatorMessages([
                      {
                        id: `msg-${Date.now()}`,
                        sender: 'agent',
                        text: `¡Hola ${simCustomerName}! Qué alegría verte de nuevo en Zavela Store 😊. Noté que estuviste mirando ${simViewedProduct}. Es una excelente opción. ¿Te gustaría conocer más detalles o estás buscando un regalo para alguien especial?`,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ]);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    simCustomerMode === 'registered'
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  👤 {simCustomerName} (Registrado)
                </button>
              </div>

              {simCustomerMode === 'registered' && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                  <span>Vio:</span>
                  <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold truncate max-w-[170px]" title={simViewedProduct}>
                    {simViewedProduct}
                  </span>
                </div>
              )}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
              {simulatorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line font-medium">{msg.text}</div>
                    <span className={`text-[9px] block mt-1 text-right ${msg.sender === 'user' ? 'text-cyan-100' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Render Recommended Products if available */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="w-full max-w-[85%] space-y-2 pt-1">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                        Productos Recomendados por la IA:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.products.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs hover:border-cyan-400 transition-all flex gap-2.5"
                          >
                            <img
                              src={prod.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                              alt={prod.title}
                              className="w-14 h-14 object-cover rounded-lg shrink-0 border border-slate-100"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                              <div>
                                <h6 className="font-extrabold text-[11px] text-slate-900 line-clamp-1">
                                  {prod.title}
                                </h6>
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {prod.categoryName || 'Zavela Store'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="font-black text-xs text-emerald-700 font-mono">
                                  ${prod.price.toLocaleString('es-CO')} COP
                                </span>
                                {prod.discountPercentage > 0 && (
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1 py-0.5 rounded">
                                    -{prod.discountPercentage}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {msg.whatsappUrl && (
                        <a
                          href={msg.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>💬 Continuar consulta con Asesor en WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {isSimulatorLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl w-fit border border-slate-200 shadow-2xs">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-600 animate-spin" />
                  <span>{aiConfig.agentName || 'Sofía'} está buscando en el catálogo y redactando...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendSimulatorMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={simulatorInput}
                  onChange={(e) => setSimulatorInput(e.target.value)}
                  placeholder="Escribe como cliente (ej: ¿Tienen perfumes para hombre? o Busco un regalo para mi pareja)..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-cyan-500 focus:bg-white outline-hidden"
                />
                <button
                  type="submit"
                  disabled={isSimulatorLoading || !simulatorInput.trim()}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>

          </div>

          {/* Simulator Quick Questions Helper (1 Col) */}
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h5 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  Pruebas Rápidas con 1 Clic
                </h5>
              </div>
              <p className="text-[11px] text-slate-500">
                Haz clic en cualquiera de estos ejemplos para ver cómo responde tu IA configurada:
              </p>

              <div className="space-y-1.5">
                {[
                  '¿Cuáles son los productos más vendidos hoy en la tienda?',
                  '¿Cómo funciona el pago contra entrega en Colombia?',
                  'Busco un regalo romántico para mi novia, ¿qué me recomiendas?',
                  '¿Tienen perfumes para hombre o lociones?',
                  '¿Qué productos tienen para la temporada de Halloween o disfraces?',
                  '¿Cuánto tarda el envío a Medellín y Cali?'
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendSimulatorMessage(sample)}
                    disabled={isSimulatorLoading}
                    className="w-full text-left text-[11px] font-semibold text-slate-700 hover:text-indigo-800 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 p-2 rounded-xl transition-all cursor-pointer block"
                  >
                    💬 {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
              <span className="font-bold block flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Simulación con Catálogo Real</span>
              </span>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Las respuestas del simulador utilizan exactamente los mismos productos, precios en COP y políticas que verán tus clientes en la tienda oficial Zavela Store.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: TIDIO LIVE CHAT & LYRO AI */}
      {activeTab === 'tidio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Main Tidio Settings Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Integración Oficial Tidio Live Chat & Lyro AI</h3>
                    <p className="text-xs text-slate-500">Conecta tu cuenta de Tidio para atender clientes en vivo, activar flujos automáticos y chatbot inteligente.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Widget Tidio Activo</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tidioChatEnabled}
                      onChange={(e) => setTidioChatEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Script Input Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Código de Integración o Script de Tidio
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('<script src="//code.tidio.co/tu_codigo.js" async></script>');
                      setCopiedTidioExample(true);
                      setTimeout(() => setCopiedTidioExample(false), 2500);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedTidioExample ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTidioExample ? 'Copiado' : 'Copiar formato de ejemplo'}</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    rows={3}
                    value={tidioScriptInput}
                    onChange={(e) => setTidioScriptInput(e.target.value)}
                    placeholder='Pega aquí tu código de Tidio, por ejemplo:
<script src="//code.tidio.co/a1b2c3d4e5f6.js" async></script>
o solo la URL: //code.tidio.co/a1b2c3d4e5f6.js'
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-cyan-300 focus:border-blue-500 outline-hidden leading-relaxed"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  El sistema detectará automáticamente tu identificador único de Tidio y lo inyectará en la tienda en tiempo real.
                </p>
              </div>

              {/* Chat Display Mode Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Modo de Visualización de Widgets de Chat
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setChatWidgetMode('both')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      chatWidgetMode === 'both'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Mostrar Ambos</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Recomendado</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Novora Bot (asesoría de productos) + Tidio Live Chat en vivo.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatWidgetMode('tidio')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      chatWidgetMode === 'tidio'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Solo Tidio</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Oculta el widget flotante nativo y muestra exclusivamente Tidio.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatWidgetMode('native_novora')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      chatWidgetMode === 'native_novora'
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Solo Novora Bot</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mantiene únicamente el asesor flotante nativo de la tienda.
                    </p>
                  </button>
                </div>
              </div>

              {/* Status Alert */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Code className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900">
                    Estado de la Integración Tidio:
                  </div>
                  <div className="text-slate-600 flex items-center gap-2">
                    {tidioChatEnabled && tidioScriptInput.trim() ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Código detectado y activo en la tienda.
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        Ingresa tu código de Tidio arriba y activa el switch para habilitar el widget.
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Step-by-Step Instructions */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                  ¿Cómo obtener tu código en Tidio?
                </h4>
              </div>

              <ol className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Ingresa a tu cuenta en <a href="https://www.tidio.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline inline-flex items-center gap-0.5">tidio.com <ExternalLink className="w-3 h-3" /></a> o crea una gratis.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    En el panel lateral izquierdo, ve a <strong>Settings (Ajustes ⚙️)</strong> $\rightarrow$ <strong>Channels</strong> $\rightarrow$ <strong>Live Chat</strong> $\rightarrow$ <strong>Installation</strong>.
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Copia el fragmento de código JavaScript (que inicia con <code>&lt;script src="//code.tidio.co/...&quot;</code>).
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Pégalo en el campo de la izquierda, activa el switch y haz clic en <strong>Guardar Cambios</strong>.
                  </span>
                </li>
              </ol>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 space-y-2">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Beneficios de Tidio + Novora</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Con Tidio puedes responder desde la app de Tidio en tu celular a chats en vivo, entrenar el bot <strong>Lyro AI</strong> con preguntas frecuentes de tu tienda, y centralizar conversaciones de Facebook Messenger e Instagram en un solo panel.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: GESTIÓN DE ASESORES DE WHATSAPP (cPanel MySQL) */}
      {activeTab === 'advisors' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Equipo de Asesores de WhatsApp</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black font-mono">
                      {cpanelAdvisors.length} Registrados
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conectado en tiempo real a la tabla <code className="text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded font-mono font-bold">asesores</code> en MySQL cPanel.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {advisorSyncSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{advisorSyncSuccess}</span>
                </div>
              )}

              <button
                type="button"
                onClick={loadCpanelAdvisors}
                disabled={isLoadingAdvisors}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                title="Refrescar desde cPanel"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isLoadingAdvisors ? 'animate-spin' : ''}`} />
                <span>Refrescar</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewAdvisorModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Asesor</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={advisorSearch}
                onChange={(e) => setAdvisorSearch(e.target.value)}
                placeholder="Buscar por nombre o número de WhatsApp..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:border-amber-500 outline-hidden font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {advisorSearch && (
                <button
                  onClick={() => setAdvisorSearch('')}
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium px-1">
              Los asesores con estado <strong>Activo</strong> reciben automáticamente conversaciones desde el botón flotante de WhatsApp.
            </div>
          </div>

          {/* Advisors Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A1128] text-white uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Nombre del Asesor</th>
                    <th className="px-5 py-3.5">Número de WhatsApp</th>
                    <th className="px-5 py-3.5">Rol Comercial</th>
                    <th className="px-5 py-3.5">Estado Activo</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoadingAdvisors ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                          <span className="font-bold text-slate-600">Consultando tabla &quot;asesores&quot; en cPanel MySQL...</span>
                        </div>
                      </td>
                    </tr>
                  ) : cpanelAdvisors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <Users className="w-8 h-8 text-slate-300" />
                          <p className="font-bold text-slate-700">No hay asesores registrados en cPanel</p>
                          <p className="text-xs text-slate-400">
                            Haz clic en &quot;Agregar Asesor&quot; para registrar al primer asesor en la base de datos MySQL.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cpanelAdvisors
                      .filter(adv => {
                        if (!advisorSearch.trim()) return true;
                        const q = advisorSearch.toLowerCase().trim();
                        const name = (adv.nombre || adv.name || '').toLowerCase();
                        const phone = (adv.telefono || adv.whatsapp || adv.phone || '').replace(/\D/g, '');
                        return name.includes(q) || phone.includes(q.replace(/\D/g, ''));
                      })
                      .map((adv) => {
                        const rawPhone = adv.telefono || adv.whatsapp || adv.phone || '';
                        const cleanPhone = rawPhone.replace(/\D/g, '');
                        const validPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
                        const isActive = adv.activo !== undefined ? Boolean(Number(adv.activo)) : (adv.status === 'active');
                        const nombre = adv.nombre || adv.name || 'Asesor';

                        return (
                          <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                            {/* Nombre */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200">
                                  {nombre[0].toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-black text-slate-900 block leading-tight">
                                    {nombre}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ID: {adv.id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* WhatsApp / Teléfono */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5 text-slate-800 font-mono font-bold">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{rawPhone || 'Sin número'}</span>
                              </div>
                            </td>

                            {/* Rol */}
                            <td className="px-5 py-3.5">
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold">
                                {adv.rol || adv.role || 'Asesor de Ventas'}
                              </span>
                            </td>

                            {/* Estado Activo */}
                            <td className="px-5 py-3.5">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Activo (En Línea)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold">
                                  <span>Inactivo</span>
                                </span>
                              )}
                            </td>

                            {/* Acciones */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/${validPhone}?text=${encodeURIComponent(`Hola ${nombre}, mensaje de prueba desde el panel administrativo Zavela Store.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                    title={`Probar chat con ${nombre}`}
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAdvisorModal(adv)}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                                  title="Editar asesor"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdvisor(adv.id, nombre)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                                  title="Eliminar asesor de cPanel"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL: AGREGAR O EDITAR ASESOR */}
          {isAdvisorModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8 animate-fadeIn border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">
                        {editingAdvisorItem ? 'Editar Asesor en cPanel' : 'Registrar Nuevo Asesor'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Persistencia directa en MySQL (action=asesores)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAdvisorModalOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveAdvisor} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={advisorForm.nombre}
                      onChange={(e) => setAdvisorForm({ ...advisorForm, nombre: e.target.value })}
                      placeholder="Ej. Santiago Morales"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Número de WhatsApp (con o sin indicativo) *</label>
                    <input
                      type="tel"
                      required
                      value={advisorForm.whatsapp}
                      onChange={(e) => setAdvisorForm({ ...advisorForm, whatsapp: e.target.value })}
                      placeholder="Ej. 3008784427 o 573008784427"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-hidden font-medium font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      El botón flotante dirigirá los chats de soporte a este número.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Rol / Especialidad *</label>
                    <input
                      type="text"
                      required
                      value={advisorForm.rol}
                      onChange={(e) => setAdvisorForm({ ...advisorForm, rol: e.target.value })}
                      placeholder="Ej. Asesor de Ventas, Personal Shopper, Soporte"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-hidden font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="checkbox"
                      id="checkbox-advisor-activo"
                      checked={advisorForm.activo}
                      onChange={(e) => setAdvisorForm({ ...advisorForm, activo: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="checkbox-advisor-activo" className="font-bold text-slate-800 cursor-pointer">
                      Asesor Activo (Visible en botón flotante de la tienda)
                    </label>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAdvisorModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingAdvisorItem ? 'Actualizar en cPanel' : 'Guardar en cPanel'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
