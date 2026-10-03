import React, { useState, useEffect } from 'react';
import { 
  Users, 
  User,
  ShoppingBag, 
  Package, 
  DollarSign, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Plus, 
  Sparkles, 
  Search, 
  Filter, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Truck, 
  Calendar, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  UserPlus,
  Layers,
  ChevronDown,
  AlertCircle,
  HelpCircle,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Share2
} from 'lucide-react';
import { Advisor, AdvisorSale, DropiStatus, AdvisorPerformance, Product } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface AdminAdvisorsDropiProps {
  products?: Product[];
}

export const AdminAdvisorsDropi: React.FC<AdminAdvisorsDropiProps> = ({ products = [] }) => {
  // Tabs: 'sales' | 'dropi_bag' | 'performance' | 'register'
  const [activeTab, setActiveTab] = useState<'sales' | 'dropi_bag' | 'performance' | 'register'>('sales');
  
  // Data state
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [sales, setSales] = useState<AdvisorSale[]>([]);
  const [performance, setPerformance] = useState<AdvisorPerformance[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for manual registration
  const [formAdvisorId, setFormAdvisorId] = useState<string>('AS-001');
  const [formProductTitle, setFormProductTitle] = useState<string>('Reloj Smartwatch Ultra');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formUnitPrice, setFormUnitPrice] = useState<number>(80000);
  const [formClientName, setFormClientName] = useState<string>('');
  const [formClientPhone, setFormClientPhone] = useState<string>('');
  const [formClientCity, setFormClientCity] = useState<string>('Medellín');
  const [formClientDept, setFormClientDept] = useState<string>('Antioquia');
  const [formClientAddress, setFormClientAddress] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Unstructured WhatsApp text paste state
  const [rawWhatsAppText, setRawWhatsAppText] = useState<string>('');
  const [isParsingText, setIsParsingText] = useState<boolean>(false);

  // Modal State for New Advisor
  const [isNewAdvisorModalOpen, setIsNewAdvisorModalOpen] = useState<boolean>(false);
  const [newAdvisorName, setNewAdvisorName] = useState<string>('');
  const [newAdvisorUsername, setNewAdvisorUsername] = useState<string>('');
  const [newAdvisorPassword, setNewAdvisorPassword] = useState<string>('');
  const [showNewAdvisorPass, setShowNewAdvisorPass] = useState<boolean>(false);
  const [newAdvisorPhone, setNewAdvisorPhone] = useState<string>('');
  const [newAdvisorChannel, setNewAdvisorChannel] = useState<string>('WhatsApp Directo');
  const [newAdvisorCommission, setNewAdvisorCommission] = useState<number>(10);

  // Edit Advisor Modal
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [editAdvisorName, setEditAdvisorName] = useState<string>('');
  const [editAdvisorUsername, setEditAdvisorUsername] = useState<string>('');
  const [editAdvisorPassword, setEditAdvisorPassword] = useState<string>('');
  const [showEditAdvisorPass, setShowEditAdvisorPass] = useState<boolean>(false);
  const [editAdvisorPhone, setEditAdvisorPhone] = useState<string>('');
  const [editAdvisorChannel, setEditAdvisorChannel] = useState<string>('WhatsApp Directo');
  const [editAdvisorCommission, setEditAdvisorCommission] = useState<number>(10);

  // Password toggle map
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Helper to generate secure readable passwords
  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'adv_' + res;
  };

  // Helper to copy advisor credentials for WhatsApp
  const handleCopyAdvisorCredentials = (adv: Advisor) => {
    const pass = adv.password || 'asesor123';
    const user = adv.username || adv.id.toLowerCase();
    const text = `👋 *¡Hola ${adv.name}!* Aquí tienes tus credenciales para ingresar a tu *Portal de Asesor en Zavela Store*:\n\n🌐 *Acceso:* Haz clic en "Ingreso" y selecciona "Asesor de Ventas"\n👤 *Usuario:* ${user}\n🔑 *Contraseña:* ${pass}\n💼 *Canal:* ${adv.channel}\n💰 *Comisión:* ${adv.commissionRate || 10}% por venta\n\n¡Ingresa para registrar tus ventas manuales para despacho Dropi!`;
    
    navigator.clipboard.writeText(text);
    showToast(`📋 Credenciales de ${adv.name} copiadas para enviar por WhatsApp.`);
  };

  // Edit Sale Modal
  const [editingSale, setEditingSale] = useState<AdvisorSale | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [advRes, salesRes] = await Promise.all([
        fetch('/api/admin/advisors').then(r => r.json()),
        fetch('/api/admin/advisor-sales').then(r => r.json())
      ]);

      if (advRes.success) {
        setAdvisors(advRes.data.advisors || []);
        setPerformance(advRes.data.performance || []);
        if (advRes.data.advisors?.length > 0 && !formAdvisorId) {
          setFormAdvisorId(advRes.data.advisors[0].id);
        }
      }
      if (salesRes.success) {
        setSales(salesRes.data || []);
      }
    } catch (err) {
      console.error('Error loading advisors and sales:', err);
      showToast('Error cargando información.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter sales
  const filteredSales = sales.filter(s => {
    if (selectedAdvisorId !== 'all' && s.advisorId !== selectedAdvisorId) return false;
    if (statusFilter !== 'all' && s.dropiStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.clientName.toLowerCase().includes(q) ||
        s.clientPhone.includes(q) ||
        s.clientCity.toLowerCase().includes(q) ||
        s.productTitle.toLowerCase().includes(q) ||
        s.advisorName.toLowerCase().includes(q) ||
        s.orderNumber.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sales pending for Dropi bag
  const pendingDropiSales = sales.filter(s => s.dropiStatus === 'pendiente_bolsa');

  // Stats calculation
  const totalSalesCOP = sales
    .filter(s => s.dropiStatus !== 'cancelado')
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const totalUnitsSold = sales
    .filter(s => s.dropiStatus !== 'cancelado')
    .reduce((sum, s) => sum + (s.quantity || 1), 0);

  // Group items needed for Dropi inventory warehouse
  const requiredProductsSummary: Record<string, { title: string; units: number; totalAmount: number }> = {};
  pendingDropiSales.forEach(s => {
    if (!requiredProductsSummary[s.productTitle]) {
      requiredProductsSummary[s.productTitle] = { title: s.productTitle, units: 0, totalAmount: 0 };
    }
    requiredProductsSummary[s.productTitle].units += s.quantity || 1;
    requiredProductsSummary[s.productTitle].totalAmount += s.totalAmount || 0;
  });

  const pendingDropiAmount = pendingDropiSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  // Handle parse WhatsApp text
  const handleParseWhatsAppText = async () => {
    if (!rawWhatsAppText.trim()) {
      showToast('Pega un mensaje o texto de venta primero.');
      return;
    }
    try {
      setIsParsingText(true);
      const res = await fetch('/api/admin/advisor-sales/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawWhatsAppText })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const parsed = json.data;
        if (parsed.advisorId) setFormAdvisorId(parsed.advisorId);
        if (parsed.productTitle) setFormProductTitle(parsed.productTitle);
        if (parsed.quantity) setFormQuantity(parsed.quantity);
        if (parsed.unitPrice) setFormUnitPrice(parsed.unitPrice);
        if (parsed.clientName) setFormClientName(parsed.clientName);
        if (parsed.clientPhone) setFormClientPhone(parsed.clientPhone);
        if (parsed.clientCity) setFormClientCity(parsed.clientCity);
        if (parsed.clientDepartment) setFormClientDept(parsed.clientDepartment);
        if (parsed.clientAddress) setFormClientAddress(parsed.clientAddress);
        if (parsed.additionalNotes) setFormNotes(parsed.additionalNotes);

        showToast('¡Texto parseado y datos autocompletados con éxito!');
      } else {
        showToast('No se pudo identificar la estructura automáticamente.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error al parsear el texto.');
    } finally {
      setIsParsingText(false);
    }
  };

  // Submit new sale
  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName || !formClientPhone || !formClientAddress || !formClientCity) {
      showToast('Por favor completa todos los datos obligatorios del cliente.');
      return;
    }

    const advisor = advisors.find(a => a.id === formAdvisorId);
    const salePayload = {
      advisorId: formAdvisorId,
      advisorName: advisor?.name || 'Asesor Asignado',
      advisorChannel: advisor?.channel || 'WhatsApp Directo',
      productTitle: formProductTitle,
      quantity: Number(formQuantity) || 1,
      unitPrice: Number(formUnitPrice) || 0,
      totalAmount: (Number(formUnitPrice) || 0) * (Number(formQuantity) || 1),
      clientName: formClientName,
      clientPhone: formClientPhone,
      clientCity: formClientCity,
      clientDepartment: formClientDept,
      clientAddress: formClientAddress,
      additionalNotes: formNotes,
      dropiStatus: 'pendiente_bolsa',
      paymentMethod: 'contra_entrega'
    };

    try {
      const res = await fetch('/api/admin/advisor-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salePayload)
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Venta ${json.data.orderNumber} registrada y añadida a la Bolsa Dropi`);
        // Clear form
        setFormClientName('');
        setFormClientPhone('');
        setFormClientAddress('');
        setFormNotes('');
        setRawWhatsAppText('');
        await loadData();
        setActiveTab('sales');
      } else {
        showToast(json.message || 'Error al guardar la venta');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión al registrar venta.');
    }
  };

  // Update sale status
  const handleUpdateStatus = async (saleId: string, newStatus: DropiStatus) => {
    try {
      const res = await fetch(`/api/admin/advisor-sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dropiStatus: newStatus })
      });
      if (res.ok) {
        showToast(`Estado de pedido actualizado a ${newStatus}`);
        loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar estado.');
    }
  };

  // Delete sale
  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('¿Deseas eliminar este pedido de la bolsa de ventas?')) return;
    try {
      const res = await fetch(`/api/admin/advisor-sales/${saleId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Venta eliminada con éxito.');
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save edited sale
  const handleSaveEditedSale = async () => {
    if (!editingSale) return;
    try {
      const res = await fetch(`/api/admin/advisor-sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSale)
      });
      if (res.ok) {
        showToast('Venta y datos de cliente actualizados.');
        setEditingSale(null);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Mark all pending as mounted in Dropi
  const handleMarkAllDropi = async () => {
    if (pendingDropiSales.length === 0) {
      showToast('No hay pedidos pendientes en la bolsa Dropi.');
      return;
    }
    if (!confirm(`¿Marcar los ${pendingDropiSales.length} pedidos como "Montados en Dropi"?`)) return;

    try {
      const ids = pendingDropiSales.map(s => s.id);
      const res = await fetch('/api/admin/advisor-sales/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: 'montado_dropi' })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ ${json.count} pedidos marcados como Montados en Dropi.`);
        loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('Error actualizando lote.');
    }
  };

  // Create new advisor
  const handleCreateAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvisorName.trim()) {
      showToast('Ingresa el nombre del asesor.');
      return;
    }
    const finalUsername = (newAdvisorUsername.trim() || newAdvisorName.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const finalPassword = (newAdvisorPassword.trim() || generatePassword());

    try {
      const res = await fetch('/api/admin/advisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAdvisorName.trim(),
          username: finalUsername,
          password: finalPassword,
          phone: newAdvisorPhone.trim(),
          channel: newAdvisorChannel,
          commissionRate: Number(newAdvisorCommission) || 10,
          status: 'active'
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Subperfil creado: Usuario "${finalUsername}" / Clave "${finalPassword}"`);
        setIsNewAdvisorModalOpen(false);
        setNewAdvisorName('');
        setNewAdvisorUsername('');
        setNewAdvisorPassword('');
        setNewAdvisorPhone('');
        loadData();
      } else {
        showToast(json.message || 'Error al crear asesor.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión.');
    }
  };

  // Open Edit Advisor modal
  const handleOpenEditAdvisor = (adv: Advisor) => {
    setEditingAdvisor(adv);
    setEditAdvisorName(adv.name);
    setEditAdvisorUsername(adv.username || adv.id.toLowerCase());
    setEditAdvisorPassword(adv.password || 'asesor123');
    setEditAdvisorPhone(adv.phone || '');
    setEditAdvisorChannel(adv.channel || 'WhatsApp Directo');
    setEditAdvisorCommission(adv.commissionRate || 10);
    setShowEditAdvisorPass(false);
  };

  // Save Edit Advisor
  const handleUpdateAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdvisor) return;

    try {
      const res = await fetch(`/api/admin/advisors/${editingAdvisor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editAdvisorName.trim(),
          username: editAdvisorUsername.trim(),
          password: editAdvisorPassword.trim(),
          phone: editAdvisorPhone.trim(),
          channel: editAdvisorChannel,
          commissionRate: Number(editAdvisorCommission) || 10
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Asesor ${editAdvisorName} actualizado correctamente.`);
        setEditingAdvisor(null);
        loadData();
      } else {
        showToast(json.message || 'Error al actualizar asesor.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión.');
    }
  };

  // Delete advisor
  const handleDeleteAdvisor = async (adv: Advisor) => {
    if (!confirm(`¿Estás seguro de eliminar al asesor ${adv.name} (${adv.id})? Sus ventas registradas se mantendrán en el histórico.`)) return;

    try {
      const res = await fetch(`/api/admin/advisors/${adv.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Asesor ${adv.name} eliminado.`);
        loadData();
      } else {
        showToast(json.message || 'Error al eliminar asesor.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Settle advisor commission
  const handleSettleAdvisor = async (advId: string) => {
    const adv = advisors.find(a => a.id === advId);
    if (!adv) return;
    if (!confirm(`¿Confirmar liquidación y pago de comisiones para ${adv.name}?`)) return;
    try {
      const res = await fetch(`/api/admin/advisors/${advId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Liquidación procesada por Sergio Martínez' })
      });
      if (res.ok) {
        showToast(`Comisión de ${adv.name} liquidada con éxito.`);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Export to CSV for Dropi
  const handleExportCSV = () => {
    if (sales.length === 0) {
      showToast('No hay pedidos para exportar.');
      return;
    }
    const headers = [
      'ID Pedido',
      'ID Asesor',
      'Nombre Asesor',
      'Canal',
      'Producto',
      'Cantidad',
      'Precio Unitario',
      'Total a Cobrar',
      'Nombre Cliente',
      'Telefono',
      'Departamento',
      'Ciudad',
      'Direccion',
      'Estado Dropi',
      'Metodo Pago',
      'Notas',
      'Fecha'
    ];

    const rows = sales.map(s => [
      `"${s.orderNumber}"`,
      `"${s.advisorId}"`,
      `"${s.advisorName}"`,
      `"${s.advisorChannel || ''}"`,
      `"${s.productTitle}"`,
      s.quantity,
      s.unitPrice,
      s.totalAmount,
      `"${s.clientName}"`,
      `"${s.clientPhone}"`,
      `"${s.clientDepartment || ''}"`,
      `"${s.clientCity}"`,
      `"${s.clientAddress.replace(/"/g, '""')}"`,
      `"${s.dropiStatus}"`,
      `"Contra Entrega"`,
      `"${(s.additionalNotes || '').replace(/"/g, '""')}"`,
      `"${new Date(s.createdAt).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bolsa_pedidos_dropi_sergio_martinez_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Bolsa de Pedidos descargada en CSV Dropi.');
  };

  // Copy Dropi Table to Clipboard in 1 click
  const handleCopyDropiConsolidated = () => {
    if (pendingDropiSales.length === 0) {
      showToast('No hay pedidos pendientes en la bolsa.');
      return;
    }

    let text = `📦 BOLSA DE PEDIDOS DROPI — PERFIL PRINCIPAL: SERGIO MARTÍNEZ\n`;
    text += `Fecha: ${new Date().toLocaleDateString('es-CO')} | Total Pedidos: ${pendingDropiSales.length} | Recaudo: ${formatCOP(pendingDropiAmount)}\n\n`;
    text += `LISTADO DE DESPACHOS:\n`;

    pendingDropiSales.forEach((s, idx) => {
      text += `\n--- PEDIDO #${idx + 1} (${s.orderNumber}) --- [Asesor: ${s.advisorName}]\n`;
      text += `• Cliente: ${s.clientName}\n`;
      text += `• Teléfono: ${s.clientPhone}\n`;
      text += `• Ciudad: ${s.clientCity} (${s.clientDepartment || 'Colombia'})\n`;
      text += `• Dirección: ${s.clientAddress}\n`;
      text += `• Producto: ${s.productTitle} x${s.quantity}\n`;
      text += `• Total a Cobrar Contra Entrega: ${formatCOP(s.totalAmount)}\n`;
      if (s.additionalNotes) text += `• Notas: ${s.additionalNotes}\n`;
    });

    text += `\nRESUMEN DE BODEGA DROPI:\n`;
    Object.values(requiredProductsSummary).forEach(item => {
      text += `• ${item.title}: ${item.units} unidades\n`;
    });

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    showToast('¡Consolidado copiado al portapapeles!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const getStatusBadge = (st: DropiStatus) => {
    switch (st) {
      case 'pendiente_bolsa':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">🟡 En Bolsa de Despacho</span>;
      case 'montado_dropi':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">🔵 Despacho Confirmado</span>;
      case 'guia_generada':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">🟣 Guía Generada</span>;
      case 'enviado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">🚚 En Ruta</span>;
      case 'entregado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">🟢 Entregado</span>;
      case 'cancelado':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">🔴 Cancelado</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">{st}</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 text-cyan-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER: PERFIL PRINCIPAL DE SERGIO MARTÍNEZ */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          {/* Avatar & Perfil Sergio Martínez */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center font-black text-2xl text-cyan-400 font-mono">
                  SM
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-slate-950" title="Perfil Principal Activo" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">Sergio Martínez</h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  Administrador Principal
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Logística Nacional
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Consolidador Central de Subperfiles de Asesores, Reporte de Rendimiento Unificado y Bolsa de Pedidos para Despacho Nacional.
              </p>
            </div>
          </div>

          {/* Botones de Acción Rápida */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyDropiConsolidated}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-md"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{isCopied ? '¡Copiado!' : 'Copiar Resumen'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => setActiveTab('register')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Nueva Venta Asesor</span>
            </button>
          </div>
        </div>

        {/* 4 METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Ventas Consolidadas</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white mt-1 font-mono">{formatCOP(totalSalesCOP)}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">Todos los subperfiles</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Unidades Totales Vendidas</span>
              <Package className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-white mt-1 font-mono">{totalUnitsSold} Unidades</div>
            <div className="text-[11px] text-slate-400 mt-1">{sales.length} transacciones registradas</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Asesores Activos</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-black text-white mt-1 font-mono">{advisors.length} Asesores</div>
            <button 
              onClick={() => setIsNewAdvisorModalOpen(true)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold mt-1 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Añadir subperfil
            </button>
          </div>

          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
              <span>Bolsa Pendiente Despacho</span>
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-300 mt-1 font-mono">{pendingDropiSales.length} Pedidos</div>
            <div className="text-[11px] text-amber-400/90 font-mono mt-1 font-bold">{formatCOP(pendingDropiAmount)} por despachar</div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
                : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Ventas por Asesor ({sales.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dropi_bag')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
              activeTab === 'dropi_bag'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bolsa de Despachos ({pendingDropiSales.length})</span>
            {pendingDropiSales.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-black'
                : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Consolidado & Rendimiento</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Venta / Chat WhatsApp</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 cursor-pointer transition-colors"
            title="Refrescar Datos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: VISUALIZAR CADA VENTA DE CADA ASESOR (USER REQUEST) */}
      {/* ========================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          
          {/* BARRA DE FILTROS POR ASESOR Y BÚSQUEDA */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-4">
            
            {/* Advisor Selector Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Filtrar por Subperfil de Asesor:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedAdvisorId('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedAdvisorId === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Todos los Asesores ({sales.length})
                </button>

                {advisors.map(adv => {
                  const advSalesCount = sales.filter(s => s.advisorId === adv.id).length;
                  const isSelected = selectedAdvisorId === adv.id;
                  return (
                    <button
                      key={adv.id}
                      onClick={() => setSelectedAdvisorId(adv.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-80">{adv.id}</span>
                      <span>{adv.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}>
                        {advSalesCount}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={() => setIsNewAdvisorModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Nuevo Asesor</span>
                </button>
              </div>
            </div>

            {/* Status & Search Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, teléfono, ciudad, producto..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Todos los Estados de Despacho</option>
                  <option value="pendiente_bolsa">🟡 En Bolsa de Despacho</option>
                  <option value="montado_dropi">🔵 Despacho Confirmado</option>
                  <option value="guia_generada">🟣 Guía Generada</option>
                  <option value="enviado">🚚 En Ruta</option>
                  <option value="entregado">🟢 Entregado</option>
                  <option value="cancelado">🔴 Cancelado</option>
                </select>
              </div>

              <div className="text-right text-xs text-slate-400 flex items-center justify-end font-mono">
                Mostrando <strong className="text-white mx-1">{filteredSales.length}</strong> ventas
              </div>
            </div>
          </div>

          {/* TABLA DETALLADA DE CADA VENTA POR ASESOR */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ID / Pedido</th>
                    <th className="p-3.5">Asesor Asignado</th>
                    <th className="p-3.5">Producto & Cantidad</th>
                    <th className="p-3.5">Datos del Cliente</th>
                    <th className="p-3.5">Destino & Dirección</th>
                    <th className="p-3.5">Total a Cobrar</th>
                    <th className="p-3.5">Estado de Despacho</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        <ShoppingBag className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                        <div className="text-sm font-bold text-slate-400">No se encontraron ventas para este filtro</div>
                        <p className="text-xs text-slate-600 mt-1">Registra una nueva venta o cambia el asesor seleccionado.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-900/50 transition-colors">
                        
                        {/* ID Pedido */}
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-cyan-400">{sale.orderNumber}</div>
                          <div className="text-[10px] text-slate-500">{new Date(sale.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </td>

                        {/* Asesor */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{sale.advisorName}</span>
                          </div>
                          <div className="text-[10px] text-cyan-400/80 font-mono">{sale.advisorId} • {sale.advisorChannel || 'WhatsApp'}</div>
                        </td>

                        {/* Producto & Cantidad */}
                        <td className="p-3.5 max-w-[200px]">
                          <div className="font-semibold text-slate-100 truncate" title={sale.productTitle}>
                            {sale.productTitle}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            <span className="text-cyan-400 font-bold">{sale.quantity} und</span> × {formatCOP(sale.unitPrice)}
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="p-3.5">
                          <div className="font-bold text-white">{sale.clientName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <a
                              href={`https://wa.me/57${sale.clientPhone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(sale.clientName)},%20te%20saludamos%20de%20Zavela%20Store%20para%20confirmar%20tu%20pedido%20de%20${encodeURIComponent(sale.productTitle)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 hover:underline"
                              title="Escribir por WhatsApp"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{sale.clientPhone}</span>
                            </a>
                          </div>
                        </td>

                        {/* Ciudad y Dirección */}
                        <td className="p-3.5 max-w-[220px]">
                          <div className="font-bold text-slate-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span>{sale.clientCity}</span>
                            <span className="text-slate-500 font-normal text-[10px]">({sale.clientDepartment || 'CO'})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={sale.clientAddress}>
                            {sale.clientAddress}
                          </div>
                        </td>

                        {/* Total a Cobrar */}
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-emerald-400">{formatCOP(sale.totalAmount)}</div>
                          <div className="text-[10px] text-slate-400">Contra Entrega</div>
                        </td>

                        {/* Estado Dropi */}
                        <td className="p-3.5">
                          <select
                            value={sale.dropiStatus}
                            onChange={e => handleUpdateStatus(sale.id, e.target.value as DropiStatus)}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="pendiente_bolsa">🟡 En Bolsa de Despacho</option>
                            <option value="montado_dropi">🔵 Despacho Confirmado</option>
                            <option value="guia_generada">🟣 Guía Generada</option>
                            <option value="enviado">🚚 En Ruta</option>
                            <option value="entregado">🟢 Entregado</option>
                            <option value="cancelado">🔴 Cancelado</option>
                          </select>
                        </td>

                        {/* Acciones */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingSale(sale)}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                              title="Editar datos del cliente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              className="p-1.5 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar de la bolsa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: BOLSA DE PEDIDOS LISTA PARA DESPACHO */}
      {/* ========================================================= */}
      {activeTab === 'dropi_bag' && (
        <div className="space-y-6">
          
          {/* Banner Despacho Ready */}
          <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/30 p-6 rounded-3xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-amber-400" />
                  <h2 className="text-lg font-black text-white">Bolsa de Pedidos Consolidada para Despacho</h2>
                  <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    {pendingDropiSales.length} Pendientes
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Estos son los pedidos confirmados por los asesores que están listos para ser procesados para despacho nacional con pago contra entrega.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCopyDropiConsolidated}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer shadow-md"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  <span>{isCopied ? '¡Copiado!' : 'Copiar Resumen de Pedidos'}</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white rounded-xl text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer shadow-md"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Descargar Plantilla CSV</span>
                </button>

                <button
                  onClick={handleMarkAllDropi}
                  disabled={pendingDropiSales.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Marcar Todo como Procesado</span>
                </button>
              </div>
            </div>

            {/* Resumen de Inventario en Bodega */}
            <div className="mt-6 pt-6 border-t border-amber-500/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-mono mb-3">
                📦 Resumen de Unidades Requeridas en Bodega Central:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.keys(requiredProductsSummary).length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No hay productos pendientes de alistar.</div>
                ) : (
                  Object.values(requiredProductsSummary).map((item, i) => (
                    <div key={i} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-white text-xs truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Total a recaudar: {formatCOP(item.totalAmount)}</div>
                      </div>
                      <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-black text-xs font-mono shrink-0">
                        {item.units} uds
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabla Formateada para Despacho */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div className="font-bold text-white text-xs flex items-center gap-2">
                <span>Tabla de Carga y Despacho (Validados y Listos)</span>
              </div>
              <div className="text-xs font-mono text-amber-400 font-bold">
                Recaudo Pendiente: {formatCOP(pendingDropiAmount)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">ID Pedido</th>
                    <th className="p-3.5">Asesor</th>
                    <th className="p-3.5">Producto</th>
                    <th className="p-3.5">Cant.</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Teléfono</th>
                    <th className="p-3.5">Ciudad / Depto</th>
                    <th className="p-3.5">Dirección Completa</th>
                    <th className="p-3.5 font-mono">Total a Cobrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {pendingDropiSales.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
                        <div className="font-bold text-slate-300">¡Bolsa al día! No hay pedidos pendientes de procesar.</div>
                      </td>
                    </tr>
                  ) : (
                    pendingDropiSales.map((s, index) => (
                      <tr key={s.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-3.5 font-mono text-slate-500">{index + 1}</td>
                        <td className="p-3.5 font-mono font-bold text-amber-400">{s.orderNumber}</td>
                        <td className="p-3.5 font-semibold text-white">{s.advisorName}</td>
                        <td className="p-3.5 font-medium text-slate-200 max-w-[180px] truncate">{s.productTitle}</td>
                        <td className="p-3.5 font-mono font-black text-cyan-400">{s.quantity}</td>
                        <td className="p-3.5 font-bold text-white">{s.clientName}</td>
                        <td className="p-3.5 font-mono text-emerald-400">{s.clientPhone}</td>
                        <td className="p-3.5">{s.clientCity} ({s.clientDepartment || 'CO'})</td>
                        <td className="p-3.5 text-slate-300 max-w-[200px] truncate" title={s.clientAddress}>{s.clientAddress}</td>
                        <td className="p-3.5 font-mono font-black text-amber-300">{formatCOP(s.totalAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: REPORTE CONSOLIDADO & RENDIMIENTO DE ASESORES */}
      {/* ========================================================= */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-white text-sm">1. REPORTE CONSOLIDADO DE ASESORES & CREDENCIALES (Sergio Martínez)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Gestión de subperfiles, claves de acceso para subida de ventas, volumen comercializado y comisiones.</p>
              </div>
              <button
                onClick={() => {
                  setNewAdvisorName('');
                  setNewAdvisorUsername('');
                  setNewAdvisorPassword(generatePassword());
                  setNewAdvisorPhone('');
                  setIsNewAdvisorModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(0,245,255,0.3)]"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Asesor / Subperfil</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">ID Asesor</th>
                    <th className="p-4">Nombre Asesor</th>
                    <th className="p-4">Credenciales (Login)</th>
                    <th className="p-4">Canal</th>
                    <th className="p-4 font-mono text-center">Unidades</th>
                    <th className="p-4 font-mono">Total Ventas ($)</th>
                    <th className="p-4 font-mono">Comisión Estimada</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {performance.map(p => {
                    const matchedAdv = advisors.find(a => a.id === p.advisorId);
                    const advUser = matchedAdv?.username || p.advisorId.toLowerCase();
                    const advPass = matchedAdv?.password || 'asesor123';
                    const isPassShown = !!revealedPasswords[p.advisorId];

                    return (
                      <tr key={p.advisorId} className="hover:bg-slate-900/50 transition-colors">
                        <td className="p-4 font-mono font-black text-cyan-400">{p.advisorId}</td>
                        <td className="p-4 font-bold text-white text-sm">
                          <div>{p.advisorName}</div>
                          {matchedAdv?.phone && (
                            <div className="text-[11px] font-mono text-slate-400 font-normal">{matchedAdv.phone}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-1 min-w-[170px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Usuario:</span>
                              <span className="font-mono font-bold text-cyan-300">{advUser}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Clave:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-amber-300">
                                  {isPassShown ? advPass : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setRevealedPasswords(prev => ({ ...prev, [p.advisorId]: !prev[p.advisorId] }))}
                                  className="text-slate-400 hover:text-white cursor-pointer"
                                  title={isPassShown ? 'Ocultar' : 'Mostrar'}
                                >
                                  {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => matchedAdv && handleCopyAdvisorCredentials(matchedAdv)}
                              className="w-full mt-1 py-1 px-2 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              title="Copiar credenciales listas para enviar por WhatsApp"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Copiar para WhatsApp</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 text-xs">{p.channel}</td>
                        <td className="p-4 font-mono font-bold text-center text-slate-100">
                          <span className="bg-slate-800 px-2 py-0.5 rounded-md">{p.unitsSold} uds</span>
                        </td>
                        <td className="p-4 font-mono font-black text-emerald-400 text-sm">
                          {formatCOP(p.totalSalesCOP)}
                        </td>
                        <td className="p-4 font-mono text-amber-300 font-semibold">
                          {formatCOP(p.pendingSettlementAmountCOP)}
                        </td>
                        <td className="p-4">
                          {p.settlementStatus === 'pendiente_liquidacion' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              Pendiente Liquidar
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                              Al Día
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {matchedAdv && (
                              <button
                                onClick={() => handleOpenEditAdvisor(matchedAdv)}
                                className="p-1.5 bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="Editar Asesor o Cambiar Contraseña"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleSettleAdvisor(p.advisorId)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              title="Liquidar comisión"
                            >
                              Liquidar
                            </button>
                            {matchedAdv && (
                              <button
                                onClick={() => handleDeleteAdvisor(matchedAdv)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar Asesor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: REGISTRAR VENTA / AUTO-PARSEAR MENSAJES DE WHATSAPP */}
      {/* ========================================================= */}
      {activeTab === 'register' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LADO IZQUIERDO: CAJA DE PEGAR WHATSAPP / PARSER IA */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-sm text-white">Pegar Mensaje de Chat o WhatsApp</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pega el texto tal cual te lo envió tu asesor. Nuestro extractor inteligente identificará automáticamente el asesor, producto, cantidad, cliente, teléfono, ciudad y dirección.
              </p>

              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={rawWhatsAppText}
                  onChange={e => setRawWhatsAppText(e.target.value)}
                  placeholder={`Ejemplo de lo que puedes pegar:

Asesor: Juan (Asesor 1)
Producto: Reloj Smartwatch Ultra (2 unidades) - $160.000
Cliente: Carlos Pérez
Teléfono: 3101234567
Ciudad: Medellín, Antioquia
Dirección: Calle 10 # 40-20 Apto 301`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
                />

                <button
                  type="button"
                  onClick={handleParseWhatsAppText}
                  disabled={isParsingText || !rawWhatsAppText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isParsingText ? 'animate-spin' : ''}`} />
                  <span>{isParsingText ? 'Extrayendo Datos...' : 'Auto-Completar con 1 Clic'}</span>
                </button>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-300">💡 Ejemplo rápido disponible:</div>
                <button
                  type="button"
                  onClick={() => setRawWhatsAppText(`Asesor: Juan (Asesor 1)\nProducto: Reloj Smartwatch Ultra (2 unidades) - $160.000\nCliente: Carlos Pérez\nTeléfono: 3101234567\nCiudad: Medellín, Antioquia\nDirección: Calle 10 # 40-20 Apto 301`)}
                  className="text-cyan-400 hover:underline cursor-pointer block text-left"
                >
                  Cargar texto de ejemplo de Juan (Smartwatch 2 unds)
                </button>
              </div>
            </div>
          </div>

          {/* LADO DERECHO: FORMULARIO ESTRUCTURADO VALIDADO */}
          <div className="lg:col-span-7">
            <form onSubmit={handleRegisterSale} className="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Datos de la Venta para la Bolsa de Despacho</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">Pago Contra Entrega</span>
              </div>

              {/* Fila 1: Asesor y Producto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Asesor de Venta *</label>
                  <select
                    value={formAdvisorId}
                    onChange={e => setFormAdvisorId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    {advisors.map(adv => (
                      <option key={adv.id} value={adv.id}>
                        {adv.id} - {adv.name} ({adv.channel})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Producto Vendido *</label>
                  <input
                    type="text"
                    value={formProductTitle}
                    onChange={e => setFormProductTitle(e.target.value)}
                    placeholder="Ej. Reloj Smartwatch Ultra"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Fila 2: Cantidad y Precio Unitario */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Cantidad (Unidades) *</label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={e => setFormQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Precio Unitario ($ COP) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formUnitPrice}
                    onChange={e => setFormUnitPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400">Total a Cobrar ($ COP)</label>
                  <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-mono font-black">
                    {formatCOP(formUnitPrice * formQuantity)}
                  </div>
                </div>
              </div>

              {/* Fila 3: Datos del Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Nombre Completo del Cliente *</label>
                  <input
                    type="text"
                    value={formClientName}
                    onChange={e => setFormClientName(e.target.value)}
                    placeholder="Ej. Carlos Pérez"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Teléfono Celular (10 Dígitos) *</label>
                  <input
                    type="tel"
                    value={formClientPhone}
                    onChange={e => setFormClientPhone(e.target.value)}
                    placeholder="Ej. 3101234567"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Fila 4: Destino y Dirección */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Ciudad y Departamento *</label>
                  <input
                    type="text"
                    value={formClientCity}
                    onChange={e => setFormClientCity(e.target.value)}
                    placeholder="Ej. Medellín"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Dirección Completa de Envío *</label>
                  <input
                    type="text"
                    value={formClientAddress}
                    onChange={e => setFormClientAddress(e.target.value)}
                    placeholder="Ej. Calle 10 # 40-20 Apto 301"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              {/* Notas Adicionales */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Notas / Referencias para la Transportadora de Envío</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ej. Dejar en portería, torre 2, timbre 301"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-xl shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-slate-950" />
                <span>Confirmar Venta y Añadir a Bolsa de Despacho</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: NUEVO ASESOR / SUBPERFIL CON USUARIO Y CONTRASEÑA */}
      {/* ========================================================= */}
      {isNewAdvisorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                <span>Crear Subperfil de Asesor</span>
              </h3>
              <button
                onClick={() => setIsNewAdvisorModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdvisor} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nombre Completo del Asesor *</label>
                <input
                  type="text"
                  value={newAdvisorName}
                  onChange={e => {
                    setNewAdvisorName(e.target.value);
                    if (!newAdvisorUsername) {
                      setNewAdvisorUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                  placeholder="Ej. Valentina Morales"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Usuario para Ingreso *
                  </label>
                  <input
                    type="text"
                    value={newAdvisorUsername}
                    onChange={e => setNewAdvisorUsername(e.target.value)}
                    placeholder="Ej. valentina"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      Contraseña *
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewAdvisorPassword(generatePassword())}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      title="Generar contraseña aleatoria"
                    >
                      🎲 Generar
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewAdvisorPass ? 'text' : 'password'}
                      value={newAdvisorPassword}
                      onChange={e => setNewAdvisorPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewAdvisorPass(!showNewAdvisorPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showNewAdvisorPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  value={newAdvisorPhone}
                  onChange={e => setNewAdvisorPhone(e.target.value)}
                  placeholder="Ej. 3201234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Canal Asignado</label>
                <select
                  value={newAdvisorChannel}
                  onChange={e => setNewAdvisorChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="WhatsApp Directo">WhatsApp Directo</option>
                  <option value="TikTok Ads & Chat">TikTok Ads & Chat</option>
                  <option value="Facebook Ads & Messenger">Facebook Ads & Messenger</option>
                  <option value="Instagram DM & Reels">Instagram DM & Reels</option>
                  <option value="Llamadas y Telemercadeo">Llamadas y Telemercadeo</option>
                  <option value="Referidos y Redes">Referidos y Redes</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">% Comisión Estimada</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newAdvisorCommission}
                  onChange={e => setNewAdvisorCommission(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewAdvisorModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Crear Asesor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR ASESOR / CAMBIAR CONTRASEÑA */}
      {/* ========================================================= */}
      {editingAdvisor && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-cyan-400" />
                  <span>Editar Asesor: {editingAdvisor.name}</span>
                </h3>
                <span className="text-[11px] font-mono text-cyan-300">{editingAdvisor.id}</span>
              </div>
              <button
                onClick={() => setEditingAdvisor(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAdvisor} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nombre Completo *</label>
                <input
                  type="text"
                  value={editAdvisorName}
                  onChange={e => setEditAdvisorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Usuario *
                  </label>
                  <input
                    type="text"
                    value={editAdvisorUsername}
                    onChange={e => setEditAdvisorUsername(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <KeyRound className="w-3 h-3" />
                      Contraseña *
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditAdvisorPassword(generatePassword())}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      title="Generar nueva contraseña"
                    >
                      🎲 Generar
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditAdvisorPass ? 'text' : 'password'}
                      value={editAdvisorPassword}
                      onChange={e => setEditAdvisorPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditAdvisorPass(!showEditAdvisorPass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showEditAdvisorPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  value={editAdvisorPhone}
                  onChange={e => setEditAdvisorPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Canal Asignado</label>
                <select
                  value={editAdvisorChannel}
                  onChange={e => setEditAdvisorChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="WhatsApp Directo">WhatsApp Directo</option>
                  <option value="TikTok Ads & Chat">TikTok Ads & Chat</option>
                  <option value="Facebook Ads & Messenger">Facebook Ads & Messenger</option>
                  <option value="Instagram DM & Reels">Instagram DM & Reels</option>
                  <option value="Llamadas y Telemercadeo">Llamadas y Telemercadeo</option>
                  <option value="Referidos y Redes">Referidos y Redes</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">% Comisión Estimada</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editAdvisorCommission}
                  onChange={e => setEditAdvisorCommission(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAdvisor(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR VENTA / DATOS DEL CLIENTE */}
      {/* ========================================================= */}
      {editingSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base">Editar Datos del Pedido</h3>
                <span className="text-xs text-cyan-400 font-mono font-bold">{editingSale.orderNumber}</span>
              </div>
              <button
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Nombre del Cliente</label>
                <input
                  type="text"
                  value={editingSale.clientName}
                  onChange={e => setEditingSale({ ...editingSale, clientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Teléfono</label>
                  <input
                    type="tel"
                    value={editingSale.clientPhone}
                    onChange={e => setEditingSale({ ...editingSale, clientPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Ciudad</label>
                  <input
                    type="text"
                    value={editingSale.clientCity}
                    onChange={e => setEditingSale({ ...editingSale, clientCity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Dirección de Envío</label>
                <input
                  type="text"
                  value={editingSale.clientAddress}
                  onChange={e => setEditingSale({ ...editingSale, clientAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Total a Cobrar ($ COP)</label>
                  <input
                    type="number"
                    value={editingSale.totalAmount}
                    onChange={e => setEditingSale({ ...editingSale, totalAmount: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Estado de Despacho</label>
                  <select
                    value={editingSale.dropiStatus}
                    onChange={e => setEditingSale({ ...editingSale, dropiStatus: e.target.value as DropiStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="pendiente_bolsa">🟡 En Bolsa de Despacho</option>
                    <option value="montado_dropi">🔵 Despacho Confirmado</option>
                    <option value="guia_generada">🟣 Guía Generada</option>
                    <option value="enviado">🚚 En Ruta</option>
                    <option value="entregado">🟢 Entregado</option>
                    <option value="cancelado">🔴 Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Notas / Referencias</label>
                <input
                  type="text"
                  value={editingSale.additionalNotes || ''}
                  onChange={e => setEditingSale({ ...editingSale, additionalNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedSale}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
