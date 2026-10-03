import React from 'react';
import {
  BarChart3,
  ShoppingCart,
  Users,
  Zap,
  Palette,
  Share2,
  SlidersHorizontal,
  FolderTree,
  Sliders,
  Layers,
  ShieldCheck,
  BookOpen,
  Package,
  PlusCircle,
  Truck,
  FileText,
  FileCode,
  Database,
  Sparkles,
  Terminal,
  LogOut,
  ArrowLeft,
  Store,
  ChevronRight,
  ShieldAlert,
  ShoppingBag,
  Award,
  Bot,
  Brain,
  Send,
  Clock,
  FileCheck,
  Gift,
  Percent,
  Gamepad2,
  Gem,
  Star,
  MessageSquare
} from 'lucide-react';
import { ZavelaLogo } from '../ZavelaLogo.tsx';
import { SergioMartinezSignature } from '../SergioMartinezSignature.tsx';

export type AdminViewKey =
  // GRUPO 1: DASHBOARD Y PEDIDOS
  | 'overview'
  | 'commercemind_ai'
  | 'copilot_private_alerts'
  | 'pending_dropi_orders'
  | 'advisors_sales'
  | 'orders'
  | 'customers'
  // GRUPO 2: ENCABEZADO Y HEADER (ARRIBA)
  | 'whatsapp_ai_agent'
  | 'social_marketing'
  | 'header_ticker'
  | 'brand_identity'
  | 'contact_social'
  | 'header_buttons'
  // GRUPO 3: NAVEGACIÓN Y ESTRUCTURA
  | 'categories_menu'
  | 'exclusivity_page'
  | 'custom_subpages'
  // GRUPO 4: CUERPO DE LA TIENDA (HOME Y SECCIONES)
  | 'lucky_wheel'
  | 'gamification_game'
  | 'hero_banners'
  | 'home_sections'
  | 'reviews'
  | 'trust_badges'
  | 'blog_posts'
  // GRUPO 5: INVENTARIO Y CATÁLOGO
  | 'products'
  // GRUPO 6: VENTAS & LOGÍSTICA COD
  | 'shipping_rates'
  // GRUPO 7: PIE DE PÁGINA & CMS LEGAL
  | 'legal_policies'
  // GRUPO 8: SISTEMA & SEGURIDAD
  | 'system_security';

export type AdminSectionKey = AdminViewKey;

interface AdminSidebarProps {
  activeSection: AdminSectionKey;
  onSelectSection: (section: AdminSectionKey) => void;
  pendingOrdersCount?: number;
  totalProductsCount?: number;
  lowStockCount?: number;
  onBackToStore: () => void;
  onLogout: () => void;
}

interface NavGroup {
  number: number;
  title: string;
  items: {
    key: AdminSectionKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSelectSection,
  pendingOrdersCount = 0,
  totalProductsCount = 0,
  lowStockCount = 0,
  onBackToStore,
  onLogout
}) => {
  const groups: NavGroup[] = [
    {
      number: 1,
      title: 'GRUPO 1: DASHBOARD Y PEDIDOS',
      items: [
        { key: 'overview', label: 'Resumen de Métricas & Ventas', icon: BarChart3 },
        { 
          key: 'commercemind_ai', 
          label: 'CommerceMind AI (Copiloto & Analítica)', 
          icon: Brain,
          badge: 'Dual IA',
          badgeColor: 'bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 text-white font-black'
        },
        { 
          key: 'copilot_private_alerts', 
          label: 'Canal Privado Copiloto WhatsApp', 
          icon: MessageSquare,
          badge: '+57 300 878 4427',
          badgeColor: 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black'
        },
        { 
          key: 'pending_dropi_orders', 
          label: 'Pedidos Pendientes por Revisión y Autorizar', 
          icon: Send,
          badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} Por Autorizar` : 'Dropi Directo',
          badgeColor: pendingOrdersCount > 0 ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black' : 'bg-cyan-500 text-slate-950 font-bold'
        },
        { 
          key: 'advisors_sales', 
          label: 'Ventas por Asesor & Bolsa Dropi', 
          icon: Users,
          badge: 'Dropi Pro',
          badgeColor: 'bg-amber-400 text-slate-950 font-black'
        },
        { 
          key: 'orders', 
          label: 'Gestión de Pedidos Contra Entrega', 
          icon: ShoppingCart, 
          badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} Totales` : undefined, 
          badgeColor: 'bg-emerald-500 text-slate-950 font-bold' 
        },
        { key: 'customers', label: 'Directorio de Clientes', icon: Users },
      ]
    },
    {
      number: 2,
      title: 'GRUPO 2: ENCABEZADO Y MARCA',
      items: [
        { 
          key: 'whatsapp_ai_agent', 
          label: 'WhatsApp & Agente IA Ventas', 
          icon: Bot,
          badge: 'IA 3.7',
          badgeColor: 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black'
        },
        { 
          key: 'social_marketing', 
          label: 'Redes: Facebook, TikTok e IG', 
          icon: Share2,
          badge: 'Viral Auto-Post',
          badgeColor: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white font-black'
        },
        { key: 'header_ticker', label: 'Barra Superior & Avisos Flash', icon: Zap },
        { key: 'brand_identity', label: 'Identidad, Logo y Colores', icon: Palette },
        { key: 'contact_social', label: 'Canales de Contacto & Redes', icon: Share2 },
        { key: 'header_buttons', label: 'Botones y Accesos de Cabecera', icon: SlidersHorizontal },
      ]
    },
    {
      number: 3,
      title: 'GRUPO 3: NAVEGACIÓN Y SUBPÁGINAS',
      items: [
        { key: 'categories_menu', label: 'Categorías y Subcategorías', icon: FolderTree },
        { 
          key: 'exclusivity_page', 
          label: 'Exclusividad (Bolsos & Placas)', 
          icon: Gem,
          badge: 'Edición 2026',
          badgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black'
        },
        { 
          key: 'custom_subpages', 
          label: 'Gestor de Subpáginas (Ramas)', 
          icon: Layers,
          badge: 'Multi-Página',
          badgeColor: 'bg-cyan-500 text-slate-950 font-black'
        },
      ]
    },
    {
      number: 4,
      title: 'GRUPO 4: CUERPO DE LA TIENDA (HOME & CRO)',
      items: [
        { 
          key: 'lucky_wheel', 
          label: 'Ruleta de Descuentos & Temporadas', 
          icon: Gift,
          badge: 'CRO 15%',
          badgeColor: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black'
        },
        { 
          key: 'gamification_game', 
          label: 'Desafío Flash: Atrapa Descuento', 
          icon: Gamepad2,
          badge: 'Canvas Viento',
          badgeColor: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black'
        },
        { key: 'hero_banners', label: 'Carrusel de Banners (Hero)', icon: Sliders },
        { key: 'home_sections', label: 'Secciones y Bloques del Home', icon: Layers },
        { 
          key: 'reviews', 
          label: 'Calificaciones y Reseñas', 
          icon: Star,
          badge: 'Opiniones & Quejas',
          badgeColor: 'bg-amber-400 text-slate-950 font-black'
        },
        { key: 'trust_badges', label: 'Badges y Garantías de Confianza', icon: ShieldCheck },
        { key: 'blog_posts', label: 'Publicaciones y Blog', icon: BookOpen },
      ]
    },
    {
      number: 5,
      title: 'GRUPO 5: INVENTARIO Y CATÁLOGO',
      items: [
        { 
          key: 'products', 
          label: 'Catálogo de Productos', 
          icon: Package, 
          badge: lowStockCount > 0 
            ? `⚠️ ${lowStockCount} Bajo Stock` 
            : totalProductsCount > 0 ? `${totalProductsCount} Ítems` : undefined, 
          badgeColor: lowStockCount > 0 
            ? 'bg-amber-400 text-slate-950 font-black animate-pulse' 
            : 'bg-cyan-500 text-slate-950 font-black' 
        },
      ]
    },
    {
      number: 6,
      title: 'GRUPO 6: LOGÍSTICA & FLETES',
      items: [
        { key: 'shipping_rates', label: 'Tarifas de Envío por Departamento', icon: Truck },
      ]
    },
    {
      number: 7,
      title: 'GRUPO 7: CMS & LEGAL',
      items: [
        { key: 'legal_policies', label: 'Políticas, Términos y Garantías', icon: FileText },
      ]
    },
    {
      number: 8,
      title: 'GRUPO 8: SISTEMA & SEGURIDAD',
      items: [
        { key: 'system_security', label: 'Seguridad, Respaldos y Auditoría', icon: Database },
      ]
    },
  ];

  return (
    <aside className="w-72 bg-[#0A1128] border-r border-[#2A3A60] text-slate-200 flex flex-col h-full shrink-0 select-none">
      
      {/* Brand Header */}
      <div className="p-5 border-b border-[#2A3A60] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0E1838] border border-[#2A3A60] flex items-center justify-center shadow-lg shadow-[#48CAE4]/10 p-1">
            <ZavelaLogo size="xs" variant="icon-only" />
          </div>
          <div>
            <div className="font-black text-white text-sm tracking-tight flex items-center gap-1.5">
              <span>Zavela Store</span>
              <span className="text-[9px] font-bold bg-[#48CAE4]/20 text-[#48CAE4] px-1.5 py-0.5 rounded border border-[#48CAE4]/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">Control Maestro COD</div>
          </div>
        </div>
      </div>

      {/* Navigation Groups List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-[#1C2541]">
        {groups.map((group) => (
          <div key={group.number} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#48CAE4] font-mono">
              {group.title}
            </div>

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.key;

                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectSection(item.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all group cursor-pointer text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-[#FF5A36] to-[#FF3366] text-white shadow-md shadow-[#FF5A36]/30 font-black'
                        : 'text-slate-300 hover:text-white hover:bg-[#1C2541]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#48CAE4]'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        isActive ? 'bg-[#0A1128] text-white font-black' : (item.badgeColor || 'bg-[#1C2541] text-[#48CAE4]')
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer System Status & Shortcuts */}
      <div className="p-4 border-t border-[#2A3A60] bg-[#070D1F] space-y-3">
        {/* Author Signature */}
        <div className="p-2 rounded-xl bg-[#0E1838] border border-[#243356] flex items-center justify-between">
          <SergioMartinezSignature variant="compact" />
          <span className="text-[9px] font-mono font-bold bg-[#BE185D]/20 text-[#FF70A6] border border-[#BE185D]/40 px-1.5 py-0.5 rounded">
            AUTOR
          </span>
        </div>

        <div className="bg-[#141F3D] rounded-xl p-2.5 border border-[#2A3A60] text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center justify-between text-slate-200 font-mono">
            <span>Acceso Secreto:</span>
            <span className="bg-[#0E1838] px-1.5 py-0.5 rounded text-[#48CAE4] font-bold">↑ ↓ ↑ ↑ 1985</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Servidor Activo
            </span>
            <span className="text-slate-400 font-mono">v3.5.0</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onBackToStore}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1C2541] hover:bg-[#253258] text-slate-200 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-[#2A3A60]"
          >
            <Store className="w-3.5 h-3.5 text-[#48CAE4]" />
            <span>Tienda</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-bold transition-colors cursor-pointer border border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

    </aside>
  );
};
