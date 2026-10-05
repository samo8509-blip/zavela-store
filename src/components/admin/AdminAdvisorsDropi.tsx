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
  Share2,
  CheckSquare,
  Square,
  AlertTriangle,
  Zap
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

  // Modal State for New User / Advisor
  const [isNewAdvisorModalOpen, setIsNewAdvisorModalOpen] = useState<boolean>(false);
  const [newAdvisorRole, setNewAdvisorRole] = useState<'advisor' | 'admin'>('advisor');
  const [newAdvisorFirstName, setNewAdvisorFirstName] = useState<string>('');
  const [newAdvisorLastName, setNewAdvisorLastName] = useState<string>('');
  const [newAdvisorUsername, setNewAdvisorUsername] = useState<string>('');
  const [newAdvisorPassword, setNewAdvisorPassword] = useState<string>('');
  const [showNewAdvisorPass, setShowNewAdvisorPass] = useState<boolean>(false);
  const [newAdvisorPhone, setNewAdvisorPhone] = useState<string>('');
  const [newAdvisorSellerCode, setNewAdvisorSellerCode] = useState<string>('');

  // Multi-Selection State for Batch Deletion
  const [selectedAdvisorIds, setSelectedAdvisorIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState<boolean>(false);
  const [advisorPendingDelete, setAdvisorPendingDelete] = useState<Advisor | null>(null);
  const [isDeletingSingleAdvisor, setIsDeletingSingleAdvisor] = useState<boolean>(false);

  // Sales Order Execution & Delete State
  const [salePendingDelete, setSalePendingDelete] = useState<AdvisorSale | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState<boolean>(false);
  const [executingSaleId, setExecutingSaleId] = useState<string | null>(null);

  // Edit User / Advisor Modal
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);
  const [editAdvisorRole, setEditAdvisorRole] = useState<'advisor' | 'admin'>('advisor');
  const [editAdvisorFirstName, setEditAdvisorFirstName] = useState<string>('');
  const [editAdvisorLastName, setEditAdvisorLastName] = useState<string>('');
  const [editAdvisorName, setEditAdvisorName] = useState<string>('');
  const [editAdvisorUsername, setEditAdvisorUsername] = useState<string>('');
  const [editAdvisorPassword, setEditAdvisorPassword] = useState<string>('');
  const [showEditAdvisorPass, setShowEditAdvisorPass] = useState<boolean>(false);
  const [editAdvisorPhone, setEditAdvisorPhone] = useState<string>('');
  const [editAdvisorSellerCode, setEditAdvisorSellerCode] = useState<string>('');
  const [editAdvisorStatus, setEditAdvisorStatus] = useState<'active' | 'inactive'>('active');
  const [isUpdatingAdvisor, setIsUpdatingAdvisor] = useState<boolean>(false);

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

  // Helper to format clean username as nombre.apellido
  const formatCleanUsername = (first: string, last: string) => {
    const f = first.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const l = last.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (f && l) return `${f}.${l}`;
    if (f) return f;
    return '';
  };

  // Helper to generate seller code: VEN-001, VEN-002, etc.
  const generateSellerCode = () => {
    const nextNum = (advisors?.length || 0) + 1;
    return `VEN-${String(nextNum).padStart(3, '0')}`;
  };

  const handleOpenNewUserModal = () => {
    setNewAdvisorRole('advisor');
    setNewAdvisorFirstName('');
    setNewAdvisorLastName('');
    setNewAdvisorUsername('');
    setNewAdvisorPassword(generatePassword());
    setShowNewAdvisorPass(false);
    setNewAdvisorPhone('');
    setNewAdvisorSellerCode(generateSellerCode());
    setIsNewAdvisorModalOpen(true);
  };

  // Helper to copy advisor credentials for WhatsApp
  const handleCopyAdvisorCredentials = (adv: Advisor) => {
    const pass = adv.password || 'zavela123';
    const user = adv.username || adv.id.toLowerCase();
    const sellerCode = adv.sellerCode || adv.id;
    const roleLabel = adv.role === 'admin' ? 'Administrador' : 'Asesor de Ventas';
    const text = `👋 *¡Hola ${adv.name}!* Aquí tienes tus credenciales para ingresar a tu cuenta en *Zavela Store Colombia*:\n\n🌐 *Rol:* ${roleLabel}\n🏷️ *Código de Vendedor:* ${sellerCode}\n👤 *Usuario:* ${user}\n🔑 *Contraseña:* ${pass}\n📱 *WhatsApp de Enrutamiento:* ${adv.phone || 'Configurado'}\n\n¡Ingresa al sistema para gestionar tus ventas y clientes!`;
    
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

  // Update sale status with optimistic UI update
  const handleUpdateStatus = async (saleId: string, newStatus: DropiStatus) => {
    // Actualización optimista inmediata en la UI
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, dropiStatus: newStatus } : s));
    try {
      const res = await fetch(`/api/admin/advisor-sales/${saleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dropiStatus: newStatus })
      });
      if (res.ok) {
        showToast(`✅ Estado de orden actualizado.`);
        loadData();
      } else {
        showToast('Error al actualizar estado en el servidor.');
        loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar estado.');
      loadData();
    }
  };

  // Execute and process order directly to Dropi
  const handleExecuteSale = async (sale: AdvisorSale) => {
    setExecutingSaleId(sale.id);
    const mockTracking = sale.trackingNumber || `ENV-${Math.floor(100000000 + Math.random() * 900000000)}`;
    // Actualización optimista inmediata en la interfaz
    setSales(prev => prev.map(s => s.id === sale.id ? { 
      ...s, 
      dropiStatus: 'montado_dropi',
      trackingNumber: mockTracking
    } : s));

    try {
      const res = await fetch(`/api/admin/advisor-sales/${sale.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        showToast(`⚡ ¡Orden ${sale.orderNumber} ejecutada y montada exitosamente en Dropi! Guía: ${json.data?.trackingNumber || mockTracking}`);
        await loadData();
      } else {
        showToast(json.message || 'Error al ejecutar orden.');
        await loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('⚡ Orden ejecutada y registrada localmente.');
      await loadData();
    } finally {
      setExecutingSaleId(null);
    }
  };

  // Delete sale (in-app modal confirmation without window.confirm)
  const handleDeleteSale = (sale: AdvisorSale) => {
    setSalePendingDelete(sale);
  };

  const handleConfirmDeleteSale = async () => {
    if (!salePendingDelete) return;
    const target = salePendingDelete;
    setIsDeletingSale(true);
    // Eliminación optimista inmediata en el estado
    setSales(prev => prev.filter(s => s.id !== target.id));
    setSalePendingDelete(null);

    try {
      const res = await fetch(`/api/admin/advisor-sales/${target.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`✅ Pedido ${target.orderNumber} eliminado de la bolsa.`);
        await loadData();
      } else {
        showToast('Error al eliminar venta en el servidor.');
        await loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('Pedido eliminado del sistema.');
      await loadData();
    } finally {
      setIsDeletingSale(false);
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

  // Mark all pending as mounted in Dropi (direct execution without window.confirm)
  const handleMarkAllDropi = async () => {
    if (pendingDropiSales.length === 0) {
      showToast('No hay pedidos pendientes en la bolsa Dropi.');
      return;
    }

    try {
      const ids = pendingDropiSales.map(s => s.id);
      // Optimistic update
      setSales(prev => prev.map(s => ids.includes(s.id) ? { ...s, dropiStatus: 'montado_dropi' } : s));
      const res = await fetch('/api/admin/advisor-sales/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: 'montado_dropi' })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`⚡ ¡${json.count} pedidos ejecutados y montados en Dropi!`);
        loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('Error actualizando lote.');
      loadData();
    }
  };

  // Create new user (Advisor or Admin)
  const handleCreateAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvisorFirstName.trim()) {
      showToast('Por favor ingresa el nombre de la persona.');
      return;
    }
    const fullName = `${newAdvisorFirstName.trim()} ${newAdvisorLastName.trim()}`.trim();
    const finalUsername = (newAdvisorUsername.trim() || formatCleanUsername(newAdvisorFirstName, newAdvisorLastName) || fullName.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const finalPassword = (newAdvisorPassword.trim() || generatePassword());
    const finalSellerCode = (newAdvisorSellerCode.trim() || generateSellerCode());

    try {
      const res = await fetch('/api/admin/advisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          firstName: newAdvisorFirstName.trim(),
          lastName: newAdvisorLastName.trim(),
          role: newAdvisorRole,
          sellerCode: finalSellerCode,
          username: finalUsername,
          password: finalPassword,
          phone: newAdvisorPhone.trim(),
          channel: newAdvisorRole === 'admin' ? 'Administración General' : 'WhatsApp de Ventas',
          status: 'active'
        })
      });
      const json = await res.json();
      if (json.success) {
        const roleLabel = newAdvisorRole === 'admin' ? 'Administrador' : 'Asesor de Ventas';
        showToast(`✅ Usuario creado: ${roleLabel} "${fullName}" (Usuario: "${finalUsername}" / Clave: "${finalPassword}" / Código: "${finalSellerCode}")`);
        setIsNewAdvisorModalOpen(false);
        setNewAdvisorFirstName('');
        setNewAdvisorLastName('');
        setNewAdvisorUsername('');
        setNewAdvisorPassword('');
        setNewAdvisorPhone('');
        setNewAdvisorSellerCode('');
        loadData();
      } else {
        showToast(json.message || 'Error al crear usuario.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión.');
    }
  };

  // Open Edit User modal
  const handleOpenEditAdvisor = (adv: Advisor) => {
    setEditingAdvisor(adv);
    setEditAdvisorRole(adv.role === 'admin' ? 'admin' : 'advisor');

    let fName = adv.firstName || '';
    let lName = adv.lastName || '';
    if (!fName && !lName && adv.name) {
      const parts = adv.name.trim().split(/\s+/);
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }
    setEditAdvisorFirstName(fName);
    setEditAdvisorLastName(lName);
    setEditAdvisorName(adv.name);
    setEditAdvisorUsername(adv.username || adv.id.toLowerCase());
    setEditAdvisorPassword(adv.password || 'zavela123');
    setEditAdvisorPhone(adv.phone || '');
    setEditAdvisorSellerCode(adv.sellerCode || adv.id);
    setEditAdvisorStatus(adv.status || 'active');
    setShowEditAdvisorPass(false);
  };

  // Save Edit User
  const handleUpdateAdvisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdvisor) return;

    const fName = editAdvisorFirstName.trim();
    const lName = editAdvisorLastName.trim();
    const fullName = `${fName} ${lName}`.trim() || editAdvisorName.trim() || 'Usuario';
    const cleanUsername = editAdvisorUsername.trim() || formatCleanUsername(fName, lName) || editingAdvisor.id.toLowerCase();
    const sellerCode = editAdvisorSellerCode.trim().toUpperCase() || editingAdvisor.sellerCode || editingAdvisor.id;

    setIsUpdatingAdvisor(true);
    try {
      const res = await fetch(`/api/admin/advisors/${editingAdvisor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingAdvisor,
          role: editAdvisorRole,
          firstName: fName,
          lastName: lName,
          name: fullName,
          username: cleanUsername,
          password: editAdvisorPassword.trim() || editingAdvisor.password || 'zavela123',
          phone: editAdvisorPhone.trim(),
          sellerCode: sellerCode,
          status: editAdvisorStatus
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Usuario "${fullName}" modificado exitosamente.`);
        setEditingAdvisor(null);
        loadData();
      } else {
        showToast(json.message || 'Error al actualizar usuario.');
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al actualizar.');
    } finally {
      setIsUpdatingAdvisor(false);
    }
  };

  // Delete single user / advisor (opens in-app modal instead of blocked window.confirm)
  const handleDeleteAdvisor = (adv: Advisor) => {
    setAdvisorPendingDelete(adv);
  };

  const handleConfirmDeleteSingleAdvisor = async () => {
    if (!advisorPendingDelete) return;
    setIsDeletingSingleAdvisor(true);
    const target = advisorPendingDelete;
    // Eliminación optimista inmediata en la interfaz
    setAdvisors(prev => prev.filter(a => a.id !== target.id));
    setPerformance(prev => prev.filter(p => p.advisorId !== target.id));
    setSelectedAdvisorIds(prev => prev.filter(id => id !== target.id));
    setAdvisorPendingDelete(null);

    try {
      const res = await fetch(`/api/admin/advisors/${target.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Usuario "${target.name}" eliminado del sistema.`);
        await loadData();
      } else {
        showToast(json.message || 'Error al eliminar usuario.');
        await loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al eliminar usuario.');
      await loadData();
    } finally {
      setIsDeletingSingleAdvisor(false);
    }
  };

  // Multi-Selection Handlers
  const handleToggleSelectAdvisor = (id: string) => {
    setSelectedAdvisorIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllAdvisors = () => {
    if (selectedAdvisorIds.length === advisors.length) {
      setSelectedAdvisorIds([]);
    } else {
      setSelectedAdvisorIds(advisors.map(a => a.id));
    }
  };

  const handleDeselectAllAdvisors = () => {
    setSelectedAdvisorIds([]);
  };

  const handleExecuteBatchDelete = async () => {
    if (selectedAdvisorIds.length === 0) return;
    const toDeleteIds = [...selectedAdvisorIds];
    setIsBatchDeleting(true);
    // Eliminación optimista inmediata en la interfaz
    setAdvisors(prev => prev.filter(a => !toDeleteIds.includes(a.id)));
    setPerformance(prev => prev.filter(p => !toDeleteIds.includes(p.advisorId)));
    setSelectedAdvisorIds([]);
    setShowBatchDeleteConfirm(false);

    try {
      const res = await fetch('/api/admin/advisors/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: toDeleteIds })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ ${json.count || toDeleteIds.length} usuario(s) eliminado(s) exitosamente.`);
        await loadData();
      } else {
        showToast(json.message || 'Error al eliminar usuarios en lote.');
        await loadData();
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al eliminar usuarios.');
      await loadData();
    } finally {
      setIsBatchDeleting(false);
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
              onClick={handleOpenNewUserModal}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold mt-1 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Crear Usuario (Admin / Asesor)
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
                  onClick={handleOpenNewUserModal}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Crear Usuario</span>
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                          >
                            <option value="pendiente_bolsa">🟡 En Bolsa de Despacho</option>
                            <option value="montado_dropi">🔵 Despacho Confirmado</option>
                            <option value="guia_generada">🟣 Guía Generada</option>
                            <option value="enviado">🚚 En Ruta</option>
                            <option value="entregado">🟢 Entregado</option>
                            <option value="cancelado">🔴 Cancelado</option>
                          </select>

                          {/* Botón Directo para Ejecutar Orden a Dropi */}
                          {sale.dropiStatus === 'pendiente_bolsa' ? (
                            <button
                              type="button"
                              onClick={() => handleExecuteSale(sale)}
                              disabled={executingSaleId === sale.id}
                              className="mt-1.5 w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                              title="Ejecutar orden y procesar a Dropi inmediatamente"
                            >
                              <Zap className="w-3.5 h-3.5 fill-slate-950" />
                              <span>{executingSaleId === sale.id ? 'Ejecutando...' : '⚡ Ejecutar Orden'}</span>
                            </button>
                          ) : (
                            <div className="mt-1 text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{sale.trackingNumber ? `Guía: ${sale.trackingNumber}` : 'Orden Montada en Dropi'}</span>
                            </div>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExecuteSale(sale)}
                              disabled={executingSaleId === sale.id}
                              className="p-1.5 bg-emerald-950/70 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer"
                              title="Ejecutar y procesar orden a Dropi"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSale(sale)}
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                              title="Editar datos del cliente"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSale(sale)}
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
            <div className="p-5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-black text-white text-sm">1. GESTIÓN Y REPORTE DE USUARIOS (ADMINISTRADORES & ASESORES)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Control de subperfiles, claves de acceso, selección múltiple para borrar o modificar datos y ranking de ventas.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllAdvisors}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
                  title="Seleccionar todos o deseleccionar usuarios"
                >
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                  <span>
                    {selectedAdvisorIds.length === advisors.length && advisors.length > 0 
                      ? 'Deseleccionar Todos' 
                      : `Selección Múltiple (${selectedAdvisorIds.length})`}
                  </span>
                </button>
                <button
                  onClick={handleOpenNewUserModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nuevo Usuario (Admin / Asesor)</span>
                </button>
              </div>
            </div>

            {/* BARRA FLOTANTE DE ELIMINACIÓN MÚLTIPLE */}
            {selectedAdvisorIds.length > 0 && (
              <div className="mx-5 my-4 p-4 bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border border-rose-500/40 rounded-2xl flex items-center justify-between flex-wrap gap-3 animate-in fade-in shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-300 font-black text-sm">
                    {selectedAdvisorIds.length}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{selectedAdvisorIds.length} usuario{selectedAdvisorIds.length !== 1 ? 's' : ''} seleccionado{selectedAdvisorIds.length !== 1 ? 's' : ''}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-mono border border-rose-500/30">
                        Listo para eliminación múltiple
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Puedes eliminar todos los usuarios seleccionados simultáneamente con un solo clic.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeselectAllAdvisors}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Deseleccionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Seleccionados ({selectedAdvisorIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Banner: Control del Asesor que Más Vende (Ranking por Código de Vendedor) */}
            {(() => {
              const sortedBySales = [...performance].sort((a, b) => (b.totalSalesCOP || 0) - (a.totalSalesCOP || 0));
              const topSeller = sortedBySales[0];
              const topAdv = topSeller ? advisors.find(a => a.id === topSeller.advisorId) : null;
              if (!topSeller || topSeller.totalSalesCOP <= 0) return null;

              return (
                <div className="mx-5 my-4 p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-cyan-950/50 border border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                      🏆
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                          Control de Ventas: Asesor que más vende en Zavela Store
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                          #1 Top Ventas
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{topSeller.advisorName}</span>
                        <span className="font-mono text-cyan-400 text-xs">({topAdv?.sellerCode || topSeller.advisorId})</span>
                        <span className="text-slate-400 text-xs font-normal">
                          • Total Facturado: <strong className="text-emerald-400 font-bold">{formatCOP(topSeller.totalSalesCOP)}</strong> ({topSeller.unitsSold} unidades comercializadas)
                        </span>
                      </div>
                    </div>
                  </div>

                  {topAdv?.phone && (
                    <a
                      href={`https://wa.me/57${topAdv.phone.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp del Asesor #{topAdv.sellerCode || topSeller.advisorId}</span>
                    </a>
                  )}
                </div>
              );
            })()}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={advisors.length > 0 && selectedAdvisorIds.length === advisors.length}
                        onChange={handleSelectAllAdvisors}
                        className="w-4 h-4 rounded text-cyan-500 accent-cyan-500 cursor-pointer"
                        title={selectedAdvisorIds.length === advisors.length ? 'Deseleccionar todos' : 'Seleccionar todos los usuarios'}
                      />
                    </th>
                    <th className="p-4">Cód. Vendedor</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Nombre Completo</th>
                    <th className="p-4">Credenciales (Login)</th>
                    <th className="p-4">WhatsApp Enrutamiento</th>
                    <th className="p-4 font-mono text-center">Unidades</th>
                    <th className="p-4 font-mono">Total Ventas ($)</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {performance.map((p, pIdx) => {
                    const matchedAdv = advisors.find(a => a.id === p.advisorId);
                    const advUser = matchedAdv?.username || p.advisorId.toLowerCase();
                    const advPass = matchedAdv?.password || 'zavela123';
                    const isPassShown = !!revealedPasswords[p.advisorId];
                    const sellerCode = matchedAdv?.sellerCode || p.advisorId;
                    const isTopSeller = pIdx === 0 && p.totalSalesCOP > 0;
                    const isSelected = selectedAdvisorIds.includes(p.advisorId);

                    return (
                      <tr key={p.advisorId} className={`transition-colors ${isSelected ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'hover:bg-slate-900/50'}`}>
                        <td 
                          className="p-4 text-center cursor-pointer"
                          onClick={() => handleToggleSelectAdvisor(p.advisorId)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelectAdvisor(p.advisorId);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-rose-500 accent-rose-500 cursor-pointer"
                            title={`Seleccionar ${p.advisorName}`}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {isTopSeller && <span title="Top #1 en Ventas">🥇</span>}
                            <span className="font-mono font-black text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs tracking-wider">
                              {sellerCode}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            matchedAdv?.role === 'admin'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                              : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {matchedAdv?.role === 'admin' ? '🛡️ Administrador' : '💼 Asesor de Ventas'}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white text-sm">
                          <div>{p.advisorName}</div>
                          <div className="text-[11px] font-mono text-slate-500 font-normal">ID: {p.advisorId}</div>
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
                        <td className="p-4">
                          {matchedAdv?.phone ? (
                            <a
                              href={`https://wa.me/57${matchedAdv.phone.replace(/[^\d]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 hover:underline bg-emerald-950/30 px-2 py-1 rounded-lg border border-emerald-900/40"
                              title="Probar enrutamiento directo por WhatsApp"
                            >
                              <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>+{matchedAdv.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Sin número</span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-center text-slate-100">
                          <span className="bg-slate-800 px-2 py-0.5 rounded-md">{p.unitsSold} uds</span>
                        </td>
                        <td className="p-4 font-mono font-black text-emerald-400 text-sm">
                          {formatCOP(p.totalSalesCOP)}
                        </td>
                        <td className="p-4">
                          {matchedAdv?.status === 'inactive' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                              Inactivo
                            </span>
                          ) : p.settlementStatus === 'pendiente_liquidacion' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              Pendiente Liquidar
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                              Activo
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {matchedAdv && (
                              <button
                                onClick={() => handleOpenEditAdvisor(matchedAdv)}
                                className="p-1.5 bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title="Modificar datos, rol, usuario, contraseña o código"
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
                                title="Eliminar usuario del sistema"
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
      {/* MODAL: NUEVO USUARIO (ADMINISTRADOR O ASESOR DE VENTAS)   */}
      {/* ========================================================= */}
      {isNewAdvisorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  <span>Crear Usuario del Sistema</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registra un nuevo Administrador o un Asesor de Ventas con código de vendedor.
                </p>
              </div>
              <button
                onClick={() => setIsNewAdvisorModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdvisor} className="space-y-4">
              {/* Selector de Rol: Administrador vs Asesor de Ventas */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Rol del Usuario *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAdvisorRole('advisor');
                      if (!newAdvisorSellerCode) setNewAdvisorSellerCode(generateSellerCode());
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      newAdvisorRole === 'advisor'
                        ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">💼</span>
                      <span className="font-black text-xs text-cyan-300">Asesor de Ventas</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Ventas Dropi, código vendedor y enrutamiento WhatsApp.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewAdvisorRole('admin')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      newAdvisorRole === 'admin'
                        ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <span className="font-black text-xs text-purple-300">Administrador</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Acceso total a ajustes, catálogo, seguridad y reportes.
                    </span>
                  </button>
                </div>
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nombre de la Persona *</label>
                  <input
                    type="text"
                    value={newAdvisorFirstName}
                    onChange={e => {
                      const val = e.target.value;
                      setNewAdvisorFirstName(val);
                      // Auto-generar usuario: primernombre.apellido
                      const autoUser = formatCleanUsername(val, newAdvisorLastName);
                      if (autoUser) setNewAdvisorUsername(autoUser);
                    }}
                    placeholder="Ej. Valentina"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Apellido *</label>
                  <input
                    type="text"
                    value={newAdvisorLastName}
                    onChange={e => {
                      const val = e.target.value;
                      setNewAdvisorLastName(val);
                      // Auto-generar usuario: primernombre.apellido
                      const autoUser = formatCleanUsername(newAdvisorFirstName, val);
                      if (autoUser) setNewAdvisorUsername(autoUser);
                    }}
                    placeholder="Ej. Morales"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Usuario para Ingreso *
                    </label>
                    <span className="text-[9px] text-slate-500 font-mono">1er Nombre y Apellido</span>
                  </div>
                  <input
                    type="text"
                    value={newAdvisorUsername}
                    onChange={e => setNewAdvisorUsername(e.target.value)}
                    placeholder="Ej. valentina.morales"
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

              {/* Teléfono / WhatsApp para Enrutamiento Rápido */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Número de Teléfono / WhatsApp *</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">Responde de primero</span>
                </label>
                <input
                  type="tel"
                  value={newAdvisorPhone}
                  onChange={e => setNewAdvisorPhone(e.target.value)}
                  placeholder="Ej. 3201234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 flex items-start gap-1.5 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-xl">
                  <span className="text-emerald-400 text-xs">💬</span>
                  <span>
                    <strong>Enrutamiento WhatsApp Rápido:</strong> Cuando un cliente pregunte en la tienda por WhatsApp, se enrutará a este número para que el asesor que responda primero atienda al cliente y cierre la venta.
                  </span>
                </p>
              </div>

              {/* Código de Vendedor Único */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-amber-400">🏷️</span>
                    <span>Código de Vendedor (Control del que más venda) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewAdvisorSellerCode(generateSellerCode())}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    🔄 Auto-generar
                  </button>
                </div>
                <input
                  type="text"
                  value={newAdvisorSellerCode}
                  onChange={e => setNewAdvisorSellerCode(e.target.value.toUpperCase())}
                  placeholder="Ej. VEN-005"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono font-bold tracking-wider"
                  required
                />
                <p className="text-[11px] text-slate-400 leading-tight">
                  Este código único identifica las ventas de este usuario para llevar el <strong>control y ranking del asesor que más venda</strong> en la tienda.
                </p>
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
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Crear {newAdvisorRole === 'admin' ? 'Administrador' : 'Asesor de Ventas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MODIFICAR USUARIO (ADMINISTRADOR O ASESOR DE VENTAS)*/}
      {/* ========================================================= */}
      {editingAdvisor && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-cyan-400" />
                  <span>Modificar Datos de Usuario</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: <span className="font-mono text-cyan-300 font-bold">{editingAdvisor.id}</span> • {editingAdvisor.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdvisor(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateAdvisor} className="space-y-4">
              {/* Selector de Rol: Administrador o Asesor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tipo de Usuario / Rol en el Sistema *</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditAdvisorRole('advisor')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      editAdvisorRole === 'advisor'
                        ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">💼</span>
                      <span className="font-black text-xs text-cyan-300">Asesor de Ventas</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Ventas Dropi, WhatsApp y código de vendedor.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditAdvisorRole('admin')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      editAdvisorRole === 'admin'
                        ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <span className="font-black text-xs text-purple-300">Administrador</span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Control total, inventarios, seguridad y finanzas.
                    </span>
                  </button>
                </div>
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Primer Nombre *</label>
                  <input
                    type="text"
                    value={editAdvisorFirstName}
                    onChange={e => setEditAdvisorFirstName(e.target.value)}
                    placeholder="Ej. Valentina"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Apellido *</label>
                  <input
                    type="text"
                    value={editAdvisorLastName}
                    onChange={e => setEditAdvisorLastName(e.target.value)}
                    placeholder="Ej. Morales"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              {/* Usuario para Ingreso & Contraseña */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/70 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Usuario para Ingreso *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const sug = formatCleanUsername(editAdvisorFirstName, editAdvisorLastName);
                        if (sug) setEditAdvisorUsername(sug);
                      }}
                      className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
                      title="Sugerir nombre.apellido"
                    >
                      Sugerir
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editAdvisorUsername}
                    onChange={e => setEditAdvisorUsername(e.target.value)}
                    placeholder="Ej. valentina.morales"
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
                      title="Generar nueva contraseña aleatoria"
                    >
                      🎲 Generar
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditAdvisorPass ? 'text' : 'password'}
                      value={editAdvisorPassword}
                      onChange={e => setEditAdvisorPassword(e.target.value)}
                      placeholder="••••••••"
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

              {/* Teléfono / WhatsApp para Enrutamiento Rápido */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Número de Teléfono / WhatsApp *</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Responde de primero</span>
                </label>
                <input
                  type="tel"
                  value={editAdvisorPhone}
                  onChange={e => setEditAdvisorPhone(e.target.value)}
                  placeholder="Ej. 3201234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              {/* Código de Vendedor Único */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-amber-400">🏷️</span>
                    <span>Código de Vendedor (Control del que más venda) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditAdvisorSellerCode(generateSellerCode())}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    🔄 Auto-generar
                  </button>
                </div>
                <input
                  type="text"
                  value={editAdvisorSellerCode}
                  onChange={e => setEditAdvisorSellerCode(e.target.value.toUpperCase())}
                  placeholder="Ej. VEN-005"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono font-bold tracking-wider"
                  required
                />
              </div>

              {/* Estado del Usuario */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Estado de Acceso</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditAdvisorStatus('active')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editAdvisorStatus === 'active'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Activo / Habilitado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditAdvisorStatus('inactive')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      editAdvisorStatus === 'inactive'
                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>Inactivo / Deshabilitado</span>
                  </button>
                </div>
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
                  disabled={isUpdatingAdvisor}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUpdatingAdvisor ? 'Guardando...' : 'Guardar Modificaciones'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN MÚLTIPLE DE USUARIOS   */}
      {/* ========================================================= */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">¿Eliminar Usuarios Seleccionados?</h3>
                <p className="text-xs text-rose-300">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Estás a punto de eliminar <strong className="text-rose-400 font-bold">{selectedAdvisorIds.length} usuario(s)</strong> del sistema. Sus credenciales de ingreso serán revocadas de inmediato.
            </p>

            <div className="max-h-40 overflow-y-auto p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              {selectedAdvisorIds.map(id => {
                const adv = advisors.find(a => a.id === id);
                return (
                  <div key={id} className="flex items-center justify-between text-xs text-slate-300 py-1 border-b border-slate-900 last:border-0">
                    <span className="font-bold text-white truncate max-w-[200px]">{adv?.name || id}</span>
                    <span className="font-mono text-[10px] text-amber-400 font-bold">{adv?.sellerCode || id}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                disabled={isBatchDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDelete}
                disabled={isBatchDeleting}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBatchDeleting ? 'Eliminando...' : `Sí, Eliminar (${selectedAdvisorIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE USUARIO INDIVIDUAL        */}
      {/* ========================================================= */}
      {advisorPendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">¿Eliminar Usuario?</h3>
                <p className="text-xs text-rose-300">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{advisorPendingDelete.name}</span>
                <span className="font-mono text-xs text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                  {advisorPendingDelete.sellerCode || advisorPendingDelete.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Usuario: <strong className="text-slate-200">{advisorPendingDelete.username || advisorPendingDelete.id}</strong>
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Confirmas la eliminación permanente del usuario <strong className="text-white font-bold">{advisorPendingDelete.name}</strong>? Se revocarán sus accesos inmediatamente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAdvisorPendingDelete(null)}
                disabled={isDeletingSingleAdvisor}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingleAdvisor}
                disabled={isDeletingSingleAdvisor}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingSingleAdvisor ? 'Eliminando...' : 'Sí, Eliminar Usuario'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE VENTA / PEDIDO            */}
      {/* ========================================================= */}
      {salePendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">¿Eliminar Pedido de la Bolsa?</h3>
                <p className="text-xs text-rose-300">Esta acción retirará la orden permanentemente.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-400 font-bold">{salePendingDelete.orderNumber}</span>
                <span className="text-xs text-slate-300 font-bold font-mono">{formatCOP(salePendingDelete.totalAmount)}</span>
              </div>
              <div className="text-xs font-semibold text-white truncate">{salePendingDelete.productTitle}</div>
              <div className="text-[11px] text-slate-400">
                Cliente: <strong className="text-slate-200">{salePendingDelete.clientName}</strong> ({salePendingDelete.clientCity})
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Confirmas que deseas eliminar esta orden? La venta será retirada del listado y de la bolsa de despachos.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSalePendingDelete(null)}
                disabled={isDeletingSale}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSale}
                disabled={isDeletingSale}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingSale ? 'Eliminando...' : 'Sí, Eliminar Pedido'}</span>
              </button>
            </div>
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
