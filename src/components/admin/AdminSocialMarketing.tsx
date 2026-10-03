import React, { useState, useEffect } from 'react';
import {
  Share2,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  MousePointer,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Send,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Sliders,
  Settings,
  Layers,
  ShoppingBag,
  ShieldCheck,
  Check,
  X,
  Play,
  Heart,
  MessageCircle,
  Repeat2,
  Bookmark,
  Music2,
  Flame,
  Radio,
  Clock,
  Sparkle,
  ArrowRight,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import { Product, SocialMarketingSettings, SocialBroadcastPost, SocialPlatformConnection } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface AdminSocialMarketingProps {
  products: Product[];
  onNavigateToProduct?: (product: Product) => void;
}

export const AdminSocialMarketing: React.FC<AdminSocialMarketingProps> = ({
  products,
  onNavigateToProduct
}) => {
  const [activeTab, setActiveTab] = useState<'publish' | 'accounts' | 'automation' | 'history'>('publish');
  const [settings, setSettings] = useState<SocialMarketingSettings | null>(null);
  const [posts, setPosts] = useState<SocialBroadcastPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Publisher State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [targetPlatforms, setTargetPlatforms] = useState<{
    facebook: boolean;
    instagram: boolean;
    tiktok: boolean;
  }>({
    facebook: true,
    instagram: true,
    tiktok: true
  });
  const [copyTone, setCopyTone] = useState<'viral_high_converting' | 'urgency_flash' | 'storytelling' | 'direct_offer'>('viral_high_converting');
  const [fbCopy, setFbCopy] = useState('');
  const [igCopy, setIgCopy] = useState('');
  const [ttCopy, setTtCopy] = useState('');
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram' | 'tiktok'>('instagram');

  // Connection Edit Modal
  const [connectModalPlatform, setConnectModalPlatform] = useState<'facebook' | 'instagram' | 'tiktok' | null>(null);
  const [modalAccountName, setModalAccountName] = useState('');
  const [modalPageOrId, setModalPageOrId] = useState('');
  const [modalToken, setModalToken] = useState('');
  const [modalPixelId, setModalPixelId] = useState('');

  // New hashtag state for automation tab
  const [newHashtagInput, setNewHashtagInput] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settRes, postsRes] = await Promise.all([
        fetch('/api/admin/social/settings').then(r => r.json()),
        fetch('/api/admin/social/posts').then(r => r.json())
      ]);

      if (settRes.success) {
        setSettings(settRes.data);
        if (settRes.data.targetChannels) {
          setTargetPlatforms(settRes.data.targetChannels);
        }
        if (settRes.data.copyTone) {
          setCopyTone(settRes.data.copyTone);
        }
      }
      if (postsRes.success) {
        setPosts(postsRes.data);
      }
    } catch (err) {
      console.error('Error fetching social marketing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Auto populate copy on product select
  useEffect(() => {
    if (selectedProduct && !fbCopy && !igCopy && !ttCopy) {
      generateLocalCopy(selectedProduct, copyTone);
    }
  }, [selectedProductId, selectedProduct]);

  const generateLocalCopy = (prod: Product, tone: string) => {
    const formattedPrice = formatCOP(prod.price);
    let fbHook = '🔥 ¡TENDENCIA EXCLUSIVA EN COLOMBIA!';
    let igHook = '✨ Lo que estabas buscando para tu día a día ✨';
    let ttHook = 'POV: Compraste esto con Pago Contra Entrega en Colombia y superó tus expectativas 😱🇨🇴';

    if (tone === 'urgency_flash') {
      fbHook = '🚨 ¡OFERTA RELÁMPAGO POR TIEMPO LIMITADO!';
      igHook = '⏳ ¡ÚLTIMAS UNIDADES DISPONIBLES EN BODEGA NACIONAL!';
      ttHook = 'No cometas el error de quedarte sin el tuyo porque se agotan HOY 🏃💨';
    } else if (tone === 'storytelling') {
      fbHook = '💡 ¿Cansado de productos que no cumplen lo que prometen? Mira esto:';
      igHook = 'Transforma tu rutina con un solo detalle que marca la diferencia 💫';
      ttHook = 'Storytime de cómo este producto cambió por completo mis días 🥹❤️';
    }

    setFbCopy(
      `${fbHook}\n\nLlega a Zavela Store: *${prod.title}*\n\n💰 *PRECIO ESPECIAL:* ${formattedPrice}\n🚚 *PAGO CONTRA ENTREGA:* Recibes en la puerta de tu casa y pagas en efectivo o transferencia.\n✅ *GARANTÍA OFICIAL:* 30 días de respaldo directo.\n\n👇 ¡Haz tu pedido ahora mismo antes de que se agote el lote!`
    );

    setIgCopy(
      `${igHook}\n\n🌟 *${prod.title}*\n\nConseguilo hoy por solo *${formattedPrice}* con despacho prioritario a toda Colombia 🇨🇴\n\n🛍️ *¿Cómo pedirlo?*\n1. Toca el enlace de nuestro perfil\n2. Ingresa tus datos de entrega\n3. ¡Pagas al recibir en tus manos!\n\n#ZavelaStore #PagoContraEntrega #Colombia #ComprasOnline #EnvioGratis #Tendencia2026`
    );

    setTtCopy(
      `${ttHook}\n\n${prod.title} por solo ${formattedPrice} con envío contra entrega a toda Colombia 🇨🇴📦\n\n👉 Comenta "LO QUIERO" o toca el botón para ordenar el tuyo hoy. #TikTokMadeMeBuyIt #ZavelaStore #Colombia #OfertaViral`
    );
  };

  const handleGenerateAiCopy = async () => {
    if (!selectedProduct) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/admin/social/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          tone: copyTone
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.facebook) setFbCopy(data.data.facebook);
        if (data.data.instagram) setIgCopy(data.data.instagram);
        if (data.data.tiktok) setTtCopy(data.data.tiktok);
        showToast(data.aiPowered ? '✨ Copies persuasivos generados con IA Gemini 3.7' : '✨ Copies optimizados para conversión colombiana');
      } else {
        generateLocalCopy(selectedProduct, copyTone);
        showToast('Copies generados con éxito.');
      }
    } catch (err) {
      generateLocalCopy(selectedProduct, copyTone);
      showToast('Copies generados con éxito.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePublishNow = async () => {
    if (!selectedProduct) {
      alert('Selecciona un producto para publicar');
      return;
    }

    const activePlats = (['facebook', 'instagram', 'tiktok'] as const).filter(p => targetPlatforms[p]);
    if (activePlats.length === 0) {
      alert('Selecciona al menos una red social (Facebook, Instagram o TikTok)');
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch('/api/admin/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          platforms: activePlats,
          copies: {
            facebook: fbCopy,
            instagram: igCopy,
            tiktok: ttCopy
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error al publicar');

      setPosts(prev => [data.data, ...prev]);
      showToast(`🚀 ¡Publicado con éxito en [${activePlats.join(', ')}]! Generando visualizaciones y tráfico.`);
      setActiveTab('history');
    } catch (err: any) {
      alert(err.message || 'Error al publicar');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveAutomationSettings = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/social/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          targetChannels: targetPlatforms,
          copyTone: copyTone
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error al guardar');
      setSettings(data.data);
      showToast('Reglas de automatización guardadas exitosamente.');
    } catch (err: any) {
      alert(err.message || 'Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const openConnectModal = (plat: 'facebook' | 'instagram' | 'tiktok') => {
    const conn = settings?.connections[plat];
    setConnectModalPlatform(plat);
    setModalAccountName(conn?.accountName || (plat === 'facebook' ? 'Zavela Store Colombia Oficial' : plat === 'instagram' ? '@zavelastore.col' : '@zavelastore_oficial'));
    setModalPageOrId(conn?.pageId || conn?.accountId || '');
    setModalToken(conn?.accessToken || '');
    setModalPixelId(conn?.pixelId || '');
  };

  const handleSaveConnection = async () => {
    if (!connectModalPlatform) return;
    try {
      const res = await fetch(`/api/admin/social/connect/${connectModalPlatform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: modalAccountName,
          pageId: modalPageOrId,
          accountId: modalPageOrId,
          accessToken: modalToken || `token_${Date.now()}`,
          pixelId: modalPixelId
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error al conectar');

      if (settings) {
        setSettings({
          ...settings,
          connections: {
            ...settings.connections,
            [connectModalPlatform]: data.data
          }
        });
      }
      showToast(`✅ Cuenta de ${connectModalPlatform.toUpperCase()} vinculada y sincronizada correctamente.`);
      setConnectModalPlatform(null);
    } catch (err: any) {
      alert(err.message || 'Error al vincular cuenta');
    }
  };

  const handleDisconnect = async (plat: 'facebook' | 'instagram' | 'tiktok') => {
    if (!confirm(`¿Estás seguro de desvincular la cuenta de ${plat.toUpperCase()}? Se pausará la auto-publicación.`)) return;
    try {
      const res = await fetch(`/api/admin/social/disconnect/${plat}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Error al desvincular');

      if (settings) {
        setSettings({
          ...settings,
          connections: {
            ...settings.connections,
            [plat]: data.data
          }
        });
      }
      showToast(`Cuenta de ${plat.toUpperCase()} desvinculada.`);
    } catch (err: any) {
      alert(err.message || 'Error al desvincular');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro del historial?')) return;
    try {
      const res = await fetch(`/api/admin/social/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setPosts(prev => prev.filter(p => p.id !== id));
      showToast('Registro de publicación eliminado.');
    } catch (err: any) {
      alert(err.message || 'Error');
    }
  };

  // Aggregate Metrics
  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);
  const totalClicks = posts.reduce((acc, p) => acc + (p.clicks || 0), 0);
  const totalSalesAttributed = posts.reduce((acc, p) => acc + (p.attributedSalesCOP || 0), 0);
  const connectedCount = Object.values(settings?.connections || {}).filter(c => c.connected).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Alert / Toast */}
      {toastMessage && (
        <div className="bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-500/20 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-emerald-600/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-[#0A1128] via-[#101F42] to-[#0A1128] rounded-3xl p-6 sm:p-8 text-white border border-[#2A3A60] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/10 via-[#48CAE4]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white text-[10px] font-black tracking-widest uppercase shadow-xs">
                MULTI-CANAL VIRAL & AUTO-POST
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {connectedCount} de 3 Redes Conectadas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Manejo de Redes: Facebook, TikTok & Instagram</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl font-medium leading-relaxed">
              Vincula tus cuentas oficiales, publica automáticamente cada producto que subas a la tienda, y genera visualizaciones masivas y ventas con modalidad de <span className="text-[#48CAE4] font-bold">Pago Contra Entrega en Colombia</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-3 rounded-2xl bg-[#1C2A4D] hover:bg-[#253766] text-slate-300 hover:text-white transition-colors cursor-pointer border border-[#2A3A60]"
              title="Refrescar métricas"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setActiveTab('publish')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-[#48CAE4] hover:opacity-95 text-white text-xs font-black tracking-wide shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Publicar Producto Ahora</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-700/50">
          <div className="bg-[#0D1836]/80 p-4 rounded-2xl border border-[#23335A]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-cyan-400" /> Visualizaciones</span>
              <span className="text-[10px] text-emerald-400 font-extrabold">+18.4%</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {totalViews.toLocaleString()} <span className="text-xs font-normal text-slate-400">views</span>
            </div>
          </div>

          <div className="bg-[#0D1836]/80 p-4 rounded-2xl border border-[#23335A]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5"><MousePointer className="w-3.5 h-3.5 text-purple-400" /> Clics a la Tienda</span>
              <span className="text-[10px] text-cyan-400 font-extrabold">{totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0}% CTR</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {totalClicks.toLocaleString()} <span className="text-xs font-normal text-slate-400">clics</span>
            </div>
          </div>

          <div className="bg-[#0D1836]/80 p-4 rounded-2xl border border-[#23335A]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Ventas Atribuidas</span>
              <span className="text-[10px] text-emerald-400 font-extrabold">Retorno COD</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight truncate">
              {formatCOP(totalSalesAttributed)}
            </div>
          </div>

          <div className="bg-[#0D1836]/80 p-4 rounded-2xl border border-[#23335A]">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-pink-400" /> Publicaciones</span>
              <span className="text-[10px] text-slate-400">Totales</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {posts.length} <span className="text-xs font-normal text-slate-400">posts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('publish')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'publish'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className={`w-4 h-4 ${activeTab === 'publish' ? 'text-purple-600' : ''}`} />
          <span>Publicador Rápido & Mockups</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Share2 className={`w-4 h-4 ${activeTab === 'accounts' ? 'text-cyan-600' : ''}`} />
          <span>Vinculación de Cuentas (FB, IG, TikTok)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 font-mono">
            {connectedCount}/3
          </span>
        </button>

        <button
          onClick={() => setActiveTab('automation')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'automation'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings className={`w-4 h-4 ${activeTab === 'automation' ? 'text-amber-600' : ''}`} />
          <span>Reglas de Auto-Publicación</span>
          {settings?.autoPublishOnProductCreate && (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Eye className={`w-4 h-4 ${activeTab === 'history' ? 'text-emerald-600' : ''}`} />
          <span>Historial & Visualizaciones ({posts.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PUBLICADOR RÁPIDO & VISTAS PREVIAS EN VIVO         */}
      {/* ======================================================== */}
      {activeTab === 'publish' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Product Selection & Copy Controls */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Product Selector Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-purple-600" />
                  <span>1. Seleccionar Producto del Catálogo</span>
                </h2>
                <span className="text-xs text-slate-400 font-bold">
                  {products.length} productos disponibles
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Producto a promocionar:
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find(prod => prod.id === e.target.value);
                    if (p) generateLocalCopy(p, copyTone);
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} - {formatCOP(p.price)} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                  <img
                    src={selectedProduct.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
                    alt={selectedProduct.title}
                    className="w-14 h-14 rounded-xl object-cover border border-purple-200 dark:border-purple-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {selectedProduct.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatCOP(selectedProduct.price)} COP
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {selectedProduct.categoryName || 'General'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-[10px]">
                        Pago Contra Entrega
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Target Networks & AI Controls */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-cyan-600" />
                  <span>2. Canales de Destino & Tono de Persuasión</span>
                </h2>
                
                <button
                  type="button"
                  onClick={handleGenerateAiCopy}
                  disabled={isGeneratingAi || !selectedProduct}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAi ? 'Generando con IA...' : 'Generar Copies IA'}</span>
                </button>
              </div>

              {/* Network Checkboxes */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetPlatforms(prev => ({ ...prev, facebook: !prev.facebook }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                    targetPlatforms.facebook
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-400 text-blue-950 dark:text-blue-200 shadow-xs ring-1 ring-blue-400'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-black text-xs">
                      f
                    </span>
                    {targetPlatforms.facebook ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-black">Facebook Feed</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Página & Marketplace</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetPlatforms(prev => ({ ...prev, instagram: !prev.instagram }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                    targetPlatforms.instagram
                      ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-400 text-pink-950 dark:text-pink-200 shadow-xs ring-1 ring-pink-400'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white flex items-center justify-center font-black text-xs">
                      IG
                    </span>
                    {targetPlatforms.instagram ? <CheckSquare className="w-4 h-4 text-pink-600" /> : <Square className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-black">Instagram Post</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Feed & Reels Shop</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetPlatforms(prev => ({ ...prev, tiktok: !prev.tiktok }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-24 ${
                    targetPlatforms.tiktok
                      ? 'bg-slate-900 dark:bg-slate-800 border-cyan-400 text-cyan-300 shadow-xs ring-1 ring-cyan-400'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-xl bg-black text-white border border-cyan-400/50 flex items-center justify-center font-black text-xs">
                      TT
                    </span>
                    {targetPlatforms.tiktok ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">TikTok Showcase</div>
                    <div className="text-[10px] text-slate-400">Guion & Video Viral</div>
                  </div>
                </button>
              </div>

              {/* Copy Tone Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Estilo y Tono del Copy de Ventas:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'viral_high_converting', label: '🔥 Viral Impacto', desc: 'Máxima interacción' },
                    { key: 'urgency_flash', label: '🚨 Oferta Flash', desc: 'Urgencia y escasez' },
                    { key: 'storytelling', label: '📖 Storytelling', desc: 'Conexión y emoción' },
                    { key: 'direct_offer', label: '🚚 Pago al Recibir', desc: 'Foco en confianza COD' }
                  ].map(t => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setCopyTone(t.key as any);
                        if (selectedProduct) generateLocalCopy(selectedProduct, t.key);
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        copyTone === t.key
                          ? 'bg-purple-100 dark:bg-purple-900/40 border-purple-500 text-purple-950 dark:text-purple-200 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-extrabold">{t.label}</div>
                      <div className="text-[10px] opacity-75">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Copy Editors by Network */}
              <div className="space-y-4 pt-2">
                
                {targetPlatforms.facebook && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span className="flex items-center gap-1.5 text-[#1877F2]">
                        <span className="w-2 h-2 rounded-full bg-[#1877F2]" />
                        Texto para Facebook Feed:
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewPlatform('facebook')}
                        className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                      >
                        Ver en Mockup Facebook →
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={fbCopy}
                      onChange={(e) => setFbCopy(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {targetPlatforms.instagram && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span className="flex items-center gap-1.5 text-pink-600">
                        <span className="w-2 h-2 rounded-full bg-pink-500" />
                        Texto para Instagram (Caption + Hashtags):
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewPlatform('instagram')}
                        className="text-[11px] text-pink-600 hover:underline cursor-pointer"
                      >
                        Ver en Mockup Instagram →
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={igCopy}
                      onChange={(e) => setIgCopy(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                )}

                {targetPlatforms.tiktok && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        Guion / Copy Viral para TikTok:
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewPlatform('tiktok')}
                        className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                      >
                        Ver en Mockup TikTok →
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={ttCopy}
                      onChange={(e) => setTtCopy(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                )}
              </div>

              {/* Publish Action Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handlePublishNow}
                  disabled={isPublishing || !selectedProduct}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-[#48CAE4] hover:opacity-95 text-white font-black text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] disabled:opacity-50"
                >
                  <Send className={`w-5 h-5 ${isPublishing ? 'animate-bounce' : ''}`} />
                  <span>
                    {isPublishing
                      ? 'Transmitiendo a Redes Sociales...'
                      : '🚀 Publicar Ahora y Empezar a Generar Visualizaciones'}
                  </span>
                </button>
                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  Sincronización instantánea con los canales conectados y registro en historial de ventas.
                </p>
              </div>

            </div>
          </div>

          {/* Right Column: Live Mockup Preview */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Vista Previa en Vivo
                </h3>
              </div>

              {/* Preview Toggle Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('instagram')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewPlatform === 'instagram'
                      ? 'bg-white dark:bg-slate-900 text-pink-600 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('facebook')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewPlatform === 'facebook'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('tiktok')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    previewPlatform === 'tiktok'
                      ? 'bg-white dark:bg-slate-900 text-cyan-400 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  TikTok
                </button>
              </div>
            </div>

            {/* MOCKUP 1: INSTAGRAM */}
            {previewPlatform === 'instagram' && (
              <div className="bg-white dark:bg-black rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-w-sm mx-auto select-none">
                {/* IG Header */}
                <div className="p-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 p-0.5">
                      <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-black text-[10px] text-purple-600">
                        Z
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                        <span>zavelastore.col</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      </div>
                      <div className="text-[10px] text-slate-400">Publicidad • Colombia</div>
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold text-xs">•••</span>
                </div>

                {/* IG Photo Container with Shoppable Badge */}
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-900">
                  <img
                    src={selectedProduct?.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
                    alt={selectedProduct?.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Floating Price Tag / Shopping Bag */}
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg border border-white/20">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#48CAE4]" />
                    <span>{formatCOP(selectedProduct?.price || 89900)}</span>
                  </div>

                  {/* COD Tag Badge */}
                  <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-black px-2.5 py-1 rounded-full text-[10px] shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Pagas al Recibir</span>
                  </div>
                </div>

                {/* IG Action Bar */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-800 dark:text-slate-200">
                      <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      <MessageCircle className="w-5 h-5" />
                      <Send className="w-5 h-5" />
                    </div>
                    <Bookmark className="w-5 h-5 text-slate-400" />
                  </div>

                  {/* CTA Bar */}
                  <div className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-2 px-3 rounded-xl flex items-center justify-between transition-colors">
                    <span>Ver producto en Zavela Store</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>

                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    1.428 Me gusta
                  </div>

                  {/* Caption Preview */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line line-clamp-4 leading-relaxed">
                    <span className="font-black text-slate-900 dark:text-white mr-1.5">zavelastore.col</span>
                    {igCopy || '🔥 ¡Nuevo producto exclusivo con pago contra entrega en toda Colombia!'}
                  </div>

                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    HACE 2 MINUTOS • PAGO CONTRA ENTREGA
                  </div>
                </div>
              </div>
            )}

            {/* MOCKUP 2: FACEBOOK */}
            {previewPlatform === 'facebook' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-w-sm mx-auto select-none">
                {/* FB Header */}
                <div className="p-3.5 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-black text-sm shrink-0">
                    Z
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                      <span>Zavela Store Colombia</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1877F2] fill-[#1877F2] text-white inline" />
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>Publicidad</span>
                      <span>•</span>
                      <span>🌐</span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold text-xs">•••</span>
                </div>

                {/* FB Caption */}
                <div className="px-3.5 pb-3 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed line-clamp-3">
                  {fbCopy || '🔥 ¡Nuevo lanzamiento en Zavela Store! Pide hoy y paga seguro al recibir en tu casa.'}
                </div>

                {/* FB Image */}
                <div className="relative aspect-4/3 bg-slate-100 dark:bg-slate-800">
                  <img
                    src={selectedProduct?.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
                    alt={selectedProduct?.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* FB Bottom Product Card CTA */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      ZAVELASTORE.COM
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {selectedProduct?.title}
                    </div>
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCOP(selectedProduct?.price || 89900)} • Envíos a todo el país
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-black text-xs shrink-0">
                    Comprar
                  </button>
                </div>

                {/* FB Social Count */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">👍❤️ 342</span>
                  <span>48 comentarios • 36 veces compartido</span>
                </div>
              </div>
            )}

            {/* MOCKUP 3: TIKTOK */}
            {previewPlatform === 'tiktok' && (
              <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden max-w-sm mx-auto text-white select-none relative aspect-[9/16] max-h-[500px]">
                {/* Background Image simulating video */}
                <img
                  src={selectedProduct?.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
                  alt={selectedProduct?.title}
                  className="w-full h-full object-cover brightness-75"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />

                {/* TikTok Top Nav */}
                <div className="absolute top-4 left-0 right-0 px-4 flex items-center justify-between text-xs font-bold text-white/90">
                  <div className="flex items-center gap-3">
                    <span className="opacity-60">Siguiendo</span>
                    <span className="font-black border-b-2 border-white pb-0.5">Para ti</span>
                  </div>
                  <span className="text-white/80">🔍</span>
                </div>

                {/* TikTok Right Floating Actions */}
                <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 text-xs font-bold">
                  <div className="w-10 h-10 rounded-full border border-white p-0.5 relative">
                    <div className="w-full h-full rounded-full bg-purple-600 flex items-center justify-center font-black text-xs">
                      Z
                    </div>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">
                      +
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <Heart className="w-7 h-7 text-red-500 fill-red-500" />
                    <span className="text-[10px] mt-0.5">18.4K</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <MessageCircle className="w-7 h-7" />
                    <span className="text-[10px] mt-0.5">842</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <Bookmark className="w-7 h-7 text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] mt-0.5">3.2K</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <Share2 className="w-7 h-7" />
                    <span className="text-[10px] mt-0.5">Share</span>
                  </div>
                </div>

                {/* TikTok Bottom Content & Shop Badge */}
                <div className="absolute bottom-4 left-3 right-16 space-y-2 text-xs">
                  
                  {/* Shop Product Sticker Tag */}
                  <div className="inline-flex items-center gap-2 bg-yellow-400 text-slate-950 font-black px-3 py-1.5 rounded-xl shadow-lg animate-pulse">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Comprar por {formatCOP(selectedProduct?.price || 89900)}</span>
                  </div>

                  <div className="font-black text-sm">@zavelastore_oficial</div>
                  
                  <div className="text-slate-200 text-xs line-clamp-2 leading-tight">
                    {ttCopy || 'POV: Encontraste el producto en tendencia con Pago Contra Entrega en Colombia 🇨🇴😱'}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
                    <Music2 className="w-3 h-3 animate-spin" />
                    <span className="truncate">Sonido original - Tendencias Colombia 2026 🎵</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: VINCULACIÓN DE CUENTAS (FB, IG, TIKTOK)            */}
      {/* ======================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Cuentas Oficiales Vinculadas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Configura tus credenciales y páginas comerciales para permitir la publicación directa y sincronización de catálogo de productos en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* FACEBOOK CARD */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20">
                    f
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                    settings?.connections.facebook?.connected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${settings?.connections.facebook?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {settings?.connections.facebook?.connected ? 'En Línea' : 'Desconectado'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Facebook Business Page
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Meta Graph API & Tienda de Página
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Página:</span>
                    <span className="font-black text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {settings?.connections.facebook?.accountName || 'No configurada'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Page ID:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {settings?.connections.facebook?.pageId || 'fb_page_default'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Auto-Post:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {settings?.connections.facebook?.autoPostEnabled ? 'Activado' : 'Pausado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => openConnectModal('facebook')}
                  className="w-full py-2.5 rounded-xl bg-[#1877F2] hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {settings?.connections.facebook?.connected ? 'Configurar / Actualizar Token' : 'Vincular Página de Facebook'}
                </button>
                {settings?.connections.facebook?.connected && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect('facebook')}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Desvincular
                  </button>
                )}
              </div>
            </div>

            {/* INSTAGRAM CARD */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-pink-500/20">
                    IG
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                    settings?.connections.instagram?.connected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${settings?.connections.instagram?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {settings?.connections.instagram?.connected ? 'En Línea' : 'Desconectado'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Instagram Shopping & Reels
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Instagram Professional Graph API
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Cuenta:</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">
                      {settings?.connections.instagram?.accountName || '@zavelastore.col'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Account ID:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {settings?.connections.instagram?.accountId || 'ig_biz_default'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Auto-Post:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {settings?.connections.instagram?.autoPostEnabled ? 'Activado' : 'Pausado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => openConnectModal('instagram')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {settings?.connections.instagram?.connected ? 'Configurar / Actualizar Token' : 'Vincular Cuenta de Instagram'}
                </button>
                {settings?.connections.instagram?.connected && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect('instagram')}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Desvincular
                  </button>
                )}
              </div>
            </div>

            {/* TIKTOK CARD */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-black text-cyan-400 border border-cyan-400/40 flex items-center justify-center font-black text-xl shadow-md shadow-cyan-500/20">
                    TT
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                    settings?.connections.tiktok?.connected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${settings?.connections.tiktok?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                    {settings?.connections.tiktok?.connected ? 'En Línea' : 'Desconectado'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    TikTok Shop & Showcase
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    TikTok Open API & Video Automation
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Handle:</span>
                    <span className="font-black text-slate-800 dark:text-slate-200">
                      {settings?.connections.tiktok?.accountName || '@zavelastore_oficial'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Partner ID:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {settings?.connections.tiktok?.accountId || 'tt_shop_default'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Auto-Post:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {settings?.connections.tiktok?.autoPostEnabled ? 'Activado' : 'Pausado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => openConnectModal('tiktok')}
                  className="w-full py-2.5 rounded-xl bg-black hover:bg-slate-900 text-cyan-300 border border-cyan-400/30 font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {settings?.connections.tiktok?.connected ? 'Configurar / Actualizar Token' : 'Vincular Cuenta de TikTok'}
                </button>
                {settings?.connections.tiktok?.connected && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect('tiktok')}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Desvincular
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: REGLAS DE AUTOMATIZACIÓN DE NUEVOS PRODUCTOS       */}
      {/* ======================================================== */}
      {activeTab === 'automation' && settings && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Reglas de Auto-Publicación de Nuevos Productos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Cuando guardes o subas un nuevo producto a la tienda, el sistema lo publicará automáticamente en tus redes sociales vinculadas para generar visualizaciones inmediatas.
              </p>
            </div>

            {/* Main Toggle Switch */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/20 dark:to-cyan-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Publicar automáticamente cada nuevo producto creado</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Al subir un nuevo producto en el catálogo, se transmitirá de inmediato a Facebook, Instagram y TikTok.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.autoPublishOnProductCreate}
                  onChange={(e) => setSettings({ ...settings, autoPublishOnProductCreate: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Additional Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    Republicar en actualización de precio u oferta
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Avisa automáticamente si el producto entra en descuento
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoPublishOnProductUpdate}
                  onChange={(e) => setSettings({ ...settings, autoPublishOnProductUpdate: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    Destacar Distintivo de Pago Contra Entrega
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Incluye emojis y garantía de pago al recibir en casa
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeCodBadge}
                  onChange={(e) => setSettings({ ...settings, includeCodBadge: e.target.checked })}
                  className="w-5 h-5 rounded text-emerald-600 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    Incluir Precio Oficial en COP
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Muestra el precio claro para filtrar clientes calificados
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includePrice}
                  onChange={(e) => setSettings({ ...settings, includePrice: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">
                    Aviso de Envío Gratis Nacional
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Menciona envío gratis por compras superiores a $120.000 COP
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.includeFreeShippingBadge}
                  onChange={(e) => setSettings({ ...settings, includeFreeShippingBadge: e.target.checked })}
                  className="w-5 h-5 rounded text-cyan-600 cursor-pointer"
                />
              </div>

            </div>

            {/* Custom Hashtags Manager */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Hashtags Automáticos Predeterminados:
              </label>
              <div className="flex flex-wrap gap-2">
                {settings.defaultHashtags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-300 text-xs font-bold font-mono flex items-center gap-1.5"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = settings.defaultHashtags.filter((_, i) => i !== idx);
                        setSettings({ ...settings, defaultHashtags: updated });
                      }}
                      className="hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="#NuevoHashtag"
                  value={newHashtagInput}
                  onChange={(e) => setNewHashtagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newHashtagInput.trim()) {
                      e.preventDefault();
                      const tag = newHashtagInput.trim().startsWith('#') ? newHashtagInput.trim() : `#${newHashtagInput.trim()}`;
                      setSettings({ ...settings, defaultHashtags: [...settings.defaultHashtags, tag] });
                      setNewHashtagInput('');
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newHashtagInput.trim()) {
                      const tag = newHashtagInput.trim().startsWith('#') ? newHashtagInput.trim() : `#${newHashtagInput.trim()}`;
                      setSettings({ ...settings, defaultHashtags: [...settings.defaultHashtags, tag] });
                      setNewHashtagInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </div>

            {/* Custom CTA Text */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Texto de Llamado a la Acción (CTA) al final del post:
              </label>
              <input
                type="text"
                value={settings.callToActionText}
                onChange={(e) => setSettings({ ...settings, callToActionText: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAutomationSettings}
                disabled={isSaving}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Reglas de Automatización'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: HISTORIAL & VISUALIZACIONES                       */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Historial de Publicaciones & Visualizaciones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitorea el alcance, clics, me gusta y ventas atribuidas a cada post publicado en redes.
              </p>
            </div>
            
            <button
              onClick={() => setActiveTab('publish')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Publicación</span>
            </button>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Share2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Aún no has publicado productos en redes
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Selecciona cualquier producto en el publicador rápido para generar tus primeras visualizaciones y ventas.
              </p>
              <button
                onClick={() => setActiveTab('publish')}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Publicar Primer Producto</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all hover:border-purple-300 dark:hover:border-purple-700"
                >
                  {/* Product Info */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <img
                      src={post.productImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'}
                      alt={post.productTitle}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold">
                          PUBLICADO
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(post.publishedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                        {post.productTitle}
                      </h4>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatCOP(post.productPrice)}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <div className="flex items-center gap-1">
                          {post.platforms.includes('facebook') && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-[10px]">
                              Facebook
                            </span>
                          )}
                          {post.platforms.includes('instagram') && (
                            <span className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-[10px]">
                              Instagram
                            </span>
                          )}
                          {post.platforms.includes('tiktok') && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 border border-cyan-400/30 font-bold text-[10px]">
                              TikTok
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Badge Group */}
                  <div className="grid grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl shrink-0">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3 text-cyan-500" />
                        <span>Views</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                        {post.views.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                        <MousePointer className="w-3 h-3 text-purple-500" />
                        <span>Clics</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                        {post.clicks.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                        <Heart className="w-3 h-3 text-red-500" />
                        <span>Likes</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                        {post.likes.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        <span>Ventas</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono truncate max-w-[90px]">
                        {formatCOP(post.attributedSalesCOP)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId(post.productId);
                        setFbCopy(post.copies.facebook || '');
                        setIgCopy(post.copies.instagram || '');
                        setTtCopy(post.copies.tiktok || '');
                        setActiveTab('publish');
                      }}
                      className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-bold text-xs transition-colors cursor-pointer"
                      title="Editar y Republicar"
                    >
                      <Repeat2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* CONNECTION MODAL                                         */}
      {/* ======================================================== */}
      {connectModalPlatform && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${
                  connectModalPlatform === 'facebook' ? 'bg-[#1877F2]' : connectModalPlatform === 'instagram' ? 'bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-600' : 'bg-black text-cyan-300'
                }`}>
                  {connectModalPlatform === 'facebook' ? 'f' : connectModalPlatform === 'instagram' ? 'IG' : 'TT'}
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Vincular Cuenta de {connectModalPlatform.toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ingresa los datos de tu cuenta comercial oficial
                  </p>
                </div>
              </div>

              <button
                onClick={() => setConnectModalPlatform(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Página / Handle:
                </label>
                <input
                  type="text"
                  value={modalAccountName}
                  onChange={(e) => setModalAccountName(e.target.value)}
                  placeholder={connectModalPlatform === 'instagram' ? '@zavelastore.col' : 'Zavela Store Oficial'}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {connectModalPlatform === 'facebook' ? 'Page ID / Business ID:' : connectModalPlatform === 'instagram' ? 'Instagram Business Account ID:' : 'TikTok Partner / Shop ID:'}
                </label>
                <input
                  type="text"
                  value={modalPageOrId}
                  onChange={(e) => setModalPageOrId(e.target.value)}
                  placeholder="Ej: 109283746192"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Access Token de la API / App Secret:
                </label>
                <input
                  type="password"
                  value={modalToken}
                  onChange={(e) => setModalToken(e.target.value)}
                  placeholder="EAAG... token de acceso seguro"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              {connectModalPlatform === 'facebook' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Pixel ID (Opcional):
                  </label>
                  <input
                    type="text"
                    value={modalPixelId}
                    onChange={(e) => setModalPixelId(e.target.value)}
                    placeholder="Ej: 9847261520"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConnectModalPlatform(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConnection}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar & Sincronizar</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
