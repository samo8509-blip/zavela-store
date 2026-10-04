import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Activity, 
  Lock, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Terminal,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  KeyRound,
  Briefcase,
  UserPlus,
  Phone,
  Trash2,
  Edit2,
  CheckSquare,
  Square
} from 'lucide-react';
import { Product, Order, Customer, AuditLog, Advisor } from '../../types/index.ts';
import { saveFirestoreSettings } from '../../services/firestoreSettings.ts';
import { getRegisteredCustomers, updateCustomerPassword, CustomerUser } from '../../utils/customerAuthManager.ts';

interface AdminSystemSecurityProps {
  products?: Product[];
  orders?: Order[];
  customers?: Customer[];
  onRefreshAll?: () => void;
}

export interface SystemUserOption {
  id: string; // 'admin-master', 'AS-001', 'cust-xxx'
  type: 'admin' | 'advisor' | 'customer';
  name: string;
  username: string;
  roleBadge: string;
  badgeStyle: string;
  avatarLetter: string;
  advisorData?: Advisor;
  customerData?: CustomerUser;
}

const FALLBACK_ADVISORS: Advisor[] = [
  { id: 'AS-001', name: 'Juan (Asesor 1)', username: 'juan', channel: 'WhatsApp Directo / Llamadas', status: 'active', settlementStatus: 'al_dia', createdAt: '' },
  { id: 'AS-002', name: 'Valentina (Asesora 2)', username: 'valentina', channel: 'TikTok Ads & Chat', status: 'active', settlementStatus: 'al_dia', createdAt: '' },
  { id: 'AS-003', name: 'Carlos Gómez (Asesor 3)', username: 'carlos', channel: 'Facebook Ads & Messenger', status: 'active', settlementStatus: 'al_dia', createdAt: '' },
  { id: 'AS-004', name: 'Daniela Ríos (Asesora 4)', username: 'daniela', channel: 'Instagram DM & Reels', status: 'active', settlementStatus: 'al_dia', createdAt: '' },
];

export const AdminSystemSecurity: React.FC<AdminSystemSecurityProps> = ({
  products = [],
  orders = [],
  customers = [],
  onRefreshAll = () => {}
}) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  // Users & Selection State
  const [advisors, setAdvisors] = useState<Advisor[]>(FALLBACK_ADVISORS);
  const [registeredCustomers, setRegisteredCustomers] = useState<CustomerUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('admin-master');
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);
  const [passErrorMsg, setPassErrorMsg] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // New User Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'advisor' | 'admin'>('advisor');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [createPhone, setCreatePhone] = useState('');
  const [createSellerCode, setCreateSellerCode] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const formatCleanUsername = (first: string, last: string) => {
    const f = first.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const l = last.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (f && l) return `${f}.${l}`;
    if (f) return f;
    return '';
  };

  const generateSellerCode = () => {
    const nextNum = (advisors?.length || 0) + 1;
    return `VEN-${String(nextNum).padStart(3, '0')}`;
  };

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'adv_' + res;
  };

  const handleOpenCreateModal = () => {
    setCreateRole('advisor');
    setCreateFirstName('');
    setCreateLastName('');
    setCreateUsername('');
    setCreatePassword(generatePassword());
    setShowCreatePass(false);
    setCreatePhone('');
    setCreateSellerCode(generateSellerCode());
    setIsCreateModalOpen(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFirstName.trim()) {
      alert('Por favor ingresa el nombre de la persona.');
      return;
    }
    const fullName = `${createFirstName.trim()} ${createLastName.trim()}`.trim();
    const finalUsername = createUsername.trim() || formatCleanUsername(createFirstName, createLastName) || fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const finalPassword = createPassword.trim() || generatePassword();
    const finalSellerCode = createSellerCode.trim() || generateSellerCode();

    setIsSubmittingUser(true);
    try {
      const res = await fetch('/api/admin/advisors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          firstName: createFirstName.trim(),
          lastName: createLastName.trim(),
          role: createRole,
          sellerCode: finalSellerCode,
          username: finalUsername,
          password: finalPassword,
          phone: createPhone.trim(),
          channel: createRole === 'admin' ? 'Administración General' : 'WhatsApp de Ventas',
          status: 'active'
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        const createdUser = json.data;
        await loadSystemUsers();
        setSelectedUserId(createdUser.id);
        setIsCreateModalOpen(false);
        setPassSuccessMsg(`¡Usuario "${fullName}" (${createRole === 'admin' ? 'Administrador' : 'Asesor de Ventas'}) creado exitosamente! Está seleccionado para cambiar su contraseña o consultar sus datos.`);
      } else {
        alert(json.message || 'Error al crear usuario.');
      }
    } catch (e: any) {
      alert(e.message || 'Error de conexión al crear usuario.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // ==========================================
  // EDIT USER MODAL STATE & HANDLERS
  // ==========================================
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetUser, setEditTargetUser] = useState<SystemUserOption | null>(null);
  const [editRole, setEditRole] = useState<'advisor' | 'admin'>('advisor');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSellerCode, setEditSellerCode] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const handleOpenEditUserModal = (userToEdit?: SystemUserOption) => {
    const target = userToEdit || selectedUser;
    if (!target) return;
    setEditTargetUser(target);

    if (target.type === 'admin' && target.id === 'admin-master') {
      setEditRole('admin');
      setEditFirstName('Sergio');
      setEditLastName('Martínez');
      setEditUsername(target.username || 'Sergio Martinez');
      setEditPhone('3008784427');
      setEditSellerCode('MASTER');
      setEditPassword('');
    } else if (target.advisorData) {
      const adv = target.advisorData;
      setEditRole(adv.role === 'admin' ? 'admin' : 'advisor');
      setEditFirstName(adv.firstName || adv.name.split(' ')[0] || '');
      setEditLastName(adv.lastName || adv.name.split(' ').slice(1).join(' ') || '');
      setEditUsername(adv.username || adv.id);
      setEditPhone(adv.phone || '');
      setEditSellerCode(adv.sellerCode || adv.id);
      setEditPassword(adv.password || '');
    } else {
      setEditRole('advisor');
      setEditFirstName(target.name.split(' ')[0] || '');
      setEditLastName(target.name.split(' ').slice(1).join(' ') || '');
      setEditUsername(target.username);
      setEditPhone('');
      setEditSellerCode(target.id);
      setEditPassword('');
    }

    setShowEditPass(false);
    setIsEditModalOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;
    setIsSubmittingEdit(true);

    try {
      const fullName = `${editFirstName.trim()} ${editLastName.trim()}`.trim() || editTargetUser.name;
      const cleanUser = editUsername.trim() || editTargetUser.username;

      if (editTargetUser.id === 'admin-master') {
        // Guardar ajustes para Master Admin
        const updatePayload: any = { adminUsername: cleanUser };
        if (editPassword.trim()) {
          updatePayload.adminPassword = editPassword.trim();
          try {
            localStorage.setItem('zavela_admin_password', editPassword.trim());
          } catch {}
        }
        try {
          localStorage.setItem('zavela_admin_username', cleanUser);
        } catch {}
        await saveFirestoreSettings(updatePayload);
        setPassSuccessMsg(`¡Datos del Administrador Master (${fullName}) modificados exitosamente!`);
      } else if (editTargetUser.type === 'advisor' || editTargetUser.advisorData) {
        const advId = editTargetUser.advisorData?.id || editTargetUser.id;
        const res = await fetch(`/api/admin/advisors/${advId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: advId,
            name: fullName,
            firstName: editFirstName.trim(),
            lastName: editLastName.trim(),
            username: cleanUser,
            role: editRole,
            phone: editPhone.trim(),
            sellerCode: editSellerCode.trim(),
            password: editPassword.trim() || editTargetUser.advisorData?.password || 'zavela123',
            channel: editRole === 'admin' ? 'Administración General' : 'WhatsApp de Ventas'
          })
        });
        const json = await res.json();
        if (json.success) {
          setPassSuccessMsg(`¡Usuario "${fullName}" actualizado con éxito! Datos y credenciales guardados.`);
        } else {
          throw new Error(json.message || 'Error al actualizar usuario');
        }
      }
      await loadSystemUsers();
      setIsEditModalOpen(false);
    } catch (err: any) {
      setPassErrorMsg(err.message || 'Error al modificar datos del usuario.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ==========================================
  // DELETE SINGLE USER (NO window.confirm for iframe compatibility)
  // ==========================================
  const [userPendingDelete, setUserPendingDelete] = useState<SystemUserOption | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  const handleDeleteSingleUser = (userToDelete?: SystemUserOption) => {
    const target = userToDelete || selectedUser;
    if (!target) return;

    if (target.id === 'admin-master') {
      setPassErrorMsg('⚠️ Por seguridad del sistema, la cuenta del Administrador Master no puede ser eliminada.');
      return;
    }

    // Abre el modal de confirmación en interfaz (evita window.confirm bloqueado por iframes)
    setUserPendingDelete(target);
  };

  const handleConfirmSingleDelete = async () => {
    if (!userPendingDelete) return;
    setIsDeletingSingle(true);
    const target = userPendingDelete;

    try {
      const res = await fetch(`/api/admin/advisors/${target.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        // Inmediata reactividad local en el estado
        setAdvisors(prev => prev.filter(a => a.id !== target.id));
        setPassSuccessMsg(`✅ Usuario "${target.name}" eliminado permanentemente del sistema.`);
        setUserPendingDelete(null);
        await loadSystemUsers();
        setSelectedUserId('admin-master');
      } else {
        setPassErrorMsg(json.message || 'Error al eliminar usuario.');
      }
    } catch (e: any) {
      setPassErrorMsg(e?.message || 'Error de conexión al eliminar usuario.');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // ==========================================
  // MULTI-SELECTION & BATCH DELETE STATE & HANDLERS
  // ==========================================
  const [isMultiSelectModalOpen, setIsMultiSelectModalOpen] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [isConfirmingBatchDelete, setIsConfirmingBatchDelete] = useState(false);

  // Deletable users are all advisors/created admins (excluding Master Admin)
  const deletableUsers = useMemo(() => {
    return advisors.filter(a => a.id !== 'admin-master');
  }, [advisors]);

  const handleToggleBatchSelect = (id: string) => {
    if (id === 'admin-master') return;
    setIsConfirmingBatchDelete(false);
    setSelectedBatchIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllBatch = () => {
    setIsConfirmingBatchDelete(false);
    setSelectedBatchIds(deletableUsers.map(u => u.id));
  };

  const handleDeselectAllBatch = () => {
    setIsConfirmingBatchDelete(false);
    setSelectedBatchIds([]);
  };

  const handleExecuteBatchDelete = async () => {
    if (selectedBatchIds.length === 0) {
      setPassErrorMsg('Por favor selecciona al menos un usuario para eliminar.');
      return;
    }

    const count = selectedBatchIds.length;
    setIsDeletingBatch(true);
    try {
      const res = await fetch('/api/admin/advisors/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedBatchIds })
      });
      const json = await res.json();
      if (json.success) {
        const deletedCount = json.count || count;
        // Inmediata reactividad local en el estado
        setAdvisors(prev => prev.filter(a => !selectedBatchIds.includes(a.id)));
        setPassSuccessMsg(`✅ ${deletedCount} usuario(s) eliminado(s) exitosamente del sistema.`);
        setSelectedBatchIds([]);
        setIsConfirmingBatchDelete(false);
        setIsMultiSelectModalOpen(false);
        await loadSystemUsers();
        setSelectedUserId('admin-master');
      } else {
        setPassErrorMsg(json.message || 'Error en la eliminación múltiple.');
      }
    } catch (e: any) {
      setPassErrorMsg(e?.message || 'Error de conexión al eliminar usuarios.');
    } finally {
      setIsDeletingBatch(false);
    }
  };

  // Load advisors and customer users
  const loadSystemUsers = async () => {
    setIsLoadingUsers(true);
    try {
      // 1. Cargar asesores del servidor
      const res = await fetch('/api/admin/advisors');
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.data?.advisors)) {
          setAdvisors(data.data.advisors);
        }
      }
    } catch (e) {
      console.warn('Usando asesores locales:', e);
    } finally {
      setIsLoadingUsers(false);
    }

    // 2. Cargar clientes registrados
    try {
      const custs = getRegisteredCustomers();
      if (Array.isArray(custs)) {
        setRegisteredCustomers(custs);
      }
    } catch (e) {
      console.warn('Error leyendo clientes registrados:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
    loadSystemUsers();
  }, []);

  // Construir lista unificada de usuarios creados
  const allSystemUsers: SystemUserOption[] = useMemo(() => {
    const list: SystemUserOption[] = [
      {
        id: 'admin-master',
        type: 'admin',
        name: 'Sergio Martínez',
        username: 'Sergio Martinez',
        roleBadge: 'Master Admin',
        badgeStyle: 'bg-purple-100 text-purple-800 border-purple-300',
        avatarLetter: 'S'
      }
    ];

    // Asesores y Administradores Creados
    advisors.forEach(adv => {
      const isAdvAdmin = adv.role === 'admin';
      list.push({
        id: adv.id,
        type: isAdvAdmin ? 'admin' : 'advisor',
        name: adv.name || `Usuario ${adv.id}`,
        username: adv.username || adv.id,
        roleBadge: isAdvAdmin ? 'Administrador' : (adv.sellerCode ? `Asesor • ${adv.sellerCode}` : 'Asesor de Ventas'),
        badgeStyle: isAdvAdmin ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-sky-100 text-sky-800 border-sky-300',
        avatarLetter: (adv.name || 'A')[0].toUpperCase(),
        advisorData: adv
      });
    });

    // Clientes Registrados
    registeredCustomers.forEach(cust => {
      const fullName = `${cust.firstName || cust.name || 'Cliente'} ${cust.lastName || ''}`.trim();
      list.push({
        id: cust.id,
        type: 'customer',
        name: fullName,
        username: cust.email,
        roleBadge: 'Cliente Zavela',
        badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        avatarLetter: (fullName || 'C')[0].toUpperCase(),
        customerData: cust
      });
    });

    return list;
  }, [advisors, registeredCustomers]);

  // Usuario seleccionado actual
  const selectedUser = useMemo(() => {
    return allSystemUsers.find(u => u.id === selectedUserId) || allSystemUsers[0];
  }, [allSystemUsers, selectedUserId]);

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    setNewPassword('');
    setConfirmPassword('');
    setPassErrorMsg(null);
    setPassSuccessMsg(null);
  };

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.data)) {
          setLogs(data.data);
        } else if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      }
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErrorMsg(null);
    setPassSuccessMsg(null);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanNew) {
      setPassErrorMsg('Por favor ingresa la nueva contraseña.');
      return;
    }

    if (cleanNew.length < 4) {
      setPassErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPassErrorMsg('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setIsChangingPass(true);

    try {
      if (selectedUser.type === 'admin') {
        // ============================================
        // 1. ACTUALIZAR ADMINISTRADOR MASTER
        // ============================================
        let firestoreOk = false;
        try {
          await saveFirestoreSettings({ adminPassword: cleanNew });
          firestoreOk = true;
        } catch (e) {
          console.warn('Firestore admin save warning:', e);
        }

        try {
          localStorage.setItem('zavela_admin_password', cleanNew);
        } catch (e) {}

        try {
          await fetch('/api/admin/security/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              newPassword: cleanNew, 
              targetUserId: 'admin-master', 
              targetUserType: 'admin',
              targetUserName: selectedUser.name
            })
          });
        } catch (e) {}

        setPassSuccessMsg(`¡Contraseña del Administrador Master (${selectedUser.name}) actualizada exitosamente! La nueva clave está activa.`);
        setNewPassword('');
        setConfirmPassword('');
        fetchLogs();
      } else if (selectedUser.type === 'advisor') {
        // ============================================
        // 2. ACTUALIZAR ASESOR DE VENTAS DROPI
        // ============================================
        const adv = selectedUser.advisorData;
        const advisorId = adv ? adv.id : selectedUser.id;

        // Actualizar vía API
        try {
          if (adv) {
            await fetch(`/api/admin/advisors/${adv.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...adv, password: cleanNew })
            });
          }
          await fetch('/api/admin/security/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              newPassword: cleanNew, 
              targetUserId: advisorId, 
              targetUserType: 'advisor',
              targetUserName: selectedUser.name
            })
          });
        } catch (e) {
          console.warn('API update advisor warning:', e);
        }

        // Actualizar estado local
        setAdvisors(prev => prev.map(a => a.id === advisorId ? { ...a, password: cleanNew } : a));

        setPassSuccessMsg(`¡Contraseña del Asesor "${selectedUser.name}" actualizada correctamente! El asesor puede ingresar al sistema con su usuario "${selectedUser.username}" y la nueva contraseña.`);
        setNewPassword('');
        setConfirmPassword('');
        fetchLogs();
      } else if (selectedUser.type === 'customer') {
        // ============================================
        // 3. ACTUALIZAR CLIENTE REGISTRADO
        // ============================================
        const cust = selectedUser.customerData;
        const custIdOrEmail = cust ? (cust.id || cust.email) : selectedUser.username;

        const updated = await updateCustomerPassword(custIdOrEmail, cleanNew);
        if (updated) {
          setPassSuccessMsg(`¡Contraseña del cliente "${selectedUser.name}" (${selectedUser.username}) actualizada exitosamente!`);
          setNewPassword('');
          setConfirmPassword('');
          loadSystemUsers();
        } else {
          setPassErrorMsg(`No se pudo actualizar la contraseña del cliente.`);
        }
      }
    } catch (err: any) {
      console.error('Error al actualizar contraseña de usuario:', err);
      setPassErrorMsg(err?.message || 'Ocurrió un error inesperado al actualizar la contraseña.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) throw new Error('Error al generar respaldo');
      const backupData = await res.json();

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zavela_store_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error al descargar respaldo.');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('⚠️ ATENCIÓN: Restaurar un archivo de respaldo reemplazará todos los productos, pedidos, clientes y configuraciones actuales por los del archivo. ¿Deseas continuar?')) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const res = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });
      if (!res.ok) throw new Error('Error al restaurar respaldo');

      alert('Base de datos y configuración restauradas con éxito.');
      onRefreshAll();
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'El archivo de respaldo no es válido.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleExportCSV = (type: 'orders' | 'products' | 'customers') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'orders') {
      headers = ['Numero_Orden', 'Cliente', 'Telefono', 'Ciudad', 'Departamento', 'Direccion', 'Total_COP', 'Estado', 'Fecha'];
      rows = safeOrders.map(o => [
        o.orderNumber || o.id || '',
        o.customerName || (o as any).customerInfo?.fullName || '',
        o.customerPhone || (o as any).customerInfo?.phone || '',
        o.city || (o as any).customerInfo?.city || '',
        o.department || (o as any).customerInfo?.department || '',
        `"${(o.address || (o as any).customerInfo?.address || '').replace(/"/g, '""')}"`,
        String(o.total || (o as any).totalAmount || 0),
        o.status || 'pendiente',
        o.createdAt || ''
      ]);
      filename = `zavela_pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === 'products') {
      headers = ['ID', 'Titulo', 'Categoria', 'Precio_Venta_COP', 'Costo_COP', 'Stock', 'Estado'];
      rows = safeProducts.map(p => [
        p.id || '',
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.categoryName || 'General',
        String(p.price || 0),
        String(p.costPrice || 0),
        String(p.stock || 0),
        p.active ? 'Activo' : 'Inactivo'
      ]);
      filename = `zavela_inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    } else {
      headers = ['Nombre', 'Email', 'Telefono', 'Ciudad', 'Departamento', 'Total_Pedidos', 'Total_Gastado_COP'];
      rows = safeCustomers.map(c => [
        (c as any).fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
        c.email || '',
        c.phone || '',
        c.city || '',
        c.department || '',
        String((c as any).totalOrders || (c as any).ordersCount || 0),
        String((c as any).totalSpent || 0)
      ]);
      filename = `zavela_clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const safeLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            GRUPO 8: SISTEMA & SEGURIDAD
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Seguridad, Respaldos y Exportación de Datos
          </h2>
          <p className="text-xs text-slate-500">
            Control de acceso administrativo, backups en JSON, descargas a Excel/CSV y logs de auditoría.
          </p>
        </div>

        <button
          onClick={handleExportBackup}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Backup Completo JSON</span>
        </button>
      </div>

      {/* Grid: Password & Backups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Change Admin & Users Password */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-slate-900">
              <KeyRound className="w-4 h-4 text-cyan-600" />
              <h3 className="font-extrabold text-sm">Cambiar Clave de Acceso de Usuarios</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsMultiSelectModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Eliminar usuarios en lote o selección múltiple"
              >
                <CheckSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>Selección Múltiple ({deletableUsers.length})</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm shadow-cyan-500/20 cursor-pointer transition-all"
                title="Crear un nuevo usuario administrador o asesor de ventas"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Crear Usuario</span>
              </button>
              <button
                type="button"
                onClick={loadSystemUsers}
                disabled={isLoadingUsers}
                className="text-xs text-slate-500 hover:text-cyan-600 flex items-center gap-1 font-semibold cursor-pointer transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                title="Refrescar lista de usuarios"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin text-cyan-600' : ''}`} />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Selecciona el usuario al que deseas cambiarle la clave de acceso, modificar sus datos o eliminarlo del sistema. Puedes gestionar Administradores, Asesores de Ventas y Clientes.
          </p>

          {/* 1. Selector de Usuario Creado */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-600" />
                <span>1. Seleccionar Usuario Creado:</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {allSystemUsers.length} usuario{allSystemUsers.length !== 1 ? 's' : ''} disponible{allSystemUsers.length !== 1 ? 's' : ''}
              </span>
            </label>
            <div className="relative">
              <select
                id="system-user-select"
                value={selectedUserId}
                onChange={(e) => handleSelectUser(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-300 focus:border-cyan-500 focus:bg-white rounded-xl font-bold text-xs text-slate-900 outline-none transition-all cursor-pointer shadow-2xs"
              >
                <optgroup label="🛡️ Administradores del Sistema">
                  <option value="admin-master">
                    Sergio Martínez • Master Admin (Usuario: Sergio Martinez)
                  </option>
                  {advisors.filter(a => a.role === 'admin').map((adv) => (
                    <option key={adv.id} value={adv.id}>
                      {adv.name} • Administrador (Usuario: {adv.username || adv.id})
                    </option>
                  ))}
                </optgroup>

                {advisors.filter(a => a.role !== 'admin').length > 0 && (
                  <optgroup label={`💼 Asesores de Ventas (${advisors.filter(a => a.role !== 'admin').length})`}>
                    {advisors.filter(a => a.role !== 'admin').map((adv) => (
                      <option key={adv.id} value={adv.id}>
                        {adv.sellerCode || adv.id} • {adv.name} (Usuario: {adv.username || adv.id})
                      </option>
                    ))}
                  </optgroup>
                )}

                {registeredCustomers.length > 0 && (
                  <optgroup label={`👤 Clientes con Cuenta Registrada (${registeredCustomers.length})`}>
                    {registeredCustomers.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.firstName || cust.name} {cust.lastName || ''} • {cust.email}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Ficha Visual del Usuario Seleccionado con Opciones de Modificar y Borrar */}
          {selectedUser && (
            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border shadow-2xs ${
                  selectedUser.type === 'admin'
                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                    : selectedUser.type === 'advisor'
                    ? 'bg-sky-100 text-sky-700 border-sky-200'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}>
                  {selectedUser.avatarLetter}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {selectedUser.name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${selectedUser.badgeStyle}`}>
                      {selectedUser.roleBadge}
                    </span>
                    {selectedUser.advisorData?.phone && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        📱 {selectedUser.advisorData.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                    Usuario: <strong className="text-slate-700 font-semibold">{selectedUser.username}</strong>
                  </p>
                </div>
              </div>

              {/* Botones de Modificar Datos y Borrar Usuario */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                <button
                  type="button"
                  onClick={() => handleOpenEditUserModal(selectedUser)}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-cyan-50 border border-slate-300 hover:border-cyan-400 text-slate-700 hover:text-cyan-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Modificar nombre, apellido, usuario, rol, teléfono y código de vendedor"
                >
                  <Edit2 className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Modificar Datos</span>
                </button>

                {selectedUser.id !== 'admin-master' ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteSingleUser(selectedUser)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-400 text-slate-700 hover:text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Eliminar este usuario del sistema"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Eliminar</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                    <Lock className="w-3 h-3" />
                    <span>Master Protegido</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {passSuccessMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{passSuccessMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {passErrorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{passErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                2. Nueva Contraseña para {selectedUser?.name || 'el usuario'}:
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`Escribe la nueva clave para ${selectedUser?.name || 'el usuario'}...`}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white rounded-xl outline-hidden font-bold transition-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showNewPass ? 'Ocultar' : 'Mostrar'}
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Confirmar Nueva Contraseña:
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva clave..."
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-cyan-500 focus:bg-white rounded-xl outline-hidden font-bold transition-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  title={showConfirmPass ? 'Ocultar' : 'Mostrar'}
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isChangingPass ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando en la nube y sistema...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Guardar Nueva Contraseña de {selectedUser?.name || 'Usuario'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Database Restore */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Database className="w-4 h-4 text-indigo-600" />
            <h3 className="font-extrabold text-sm">Restaurar Copia de Seguridad</h3>
          </div>
          <p className="text-xs text-slate-500">
            Sube un archivo <code className="font-mono text-cyan-600">.json</code> generado previamente por este panel para recuperar todos los datos.
          </p>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 space-y-1">
              <strong className="block">Acción Crítica</strong>
              <span>Esta operación sobrescribirá los productos, clientes, pedidos y ajustes actuales.</span>
            </div>
          </div>

          <div>
            <label className="block w-full cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreBackup}
                disabled={isRestoring}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-cyan-500 bg-slate-50 hover:bg-cyan-50/50 transition-colors">
                <Upload className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-xs text-slate-700">
                  {isRestoring ? 'Restaurando datos...' : 'Seleccionar Archivo JSON de Respaldo'}
                </span>
              </div>
            </label>
          </div>
        </div>

      </div>

      {/* CSV / Excel Data Exporters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-900">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <h3 className="font-extrabold text-sm">Exportación de Datos a CSV / Excel</h3>
        </div>
        <p className="text-xs text-slate-500">
          Descarga los registros en formato compatible con Excel para liquidaciones contables o guías de transporte masivas.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            onClick={() => handleExportCSV('orders')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800 transition-colors cursor-pointer"
          >
            <span>Descargar Pedidos ({safeOrders.length})</span>
            <Download className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => handleExportCSV('products')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800 transition-colors cursor-pointer"
          >
            <span>Descargar Catálogo ({safeProducts.length})</span>
            <Download className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            onClick={() => handleExportCSV('customers')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800 transition-colors cursor-pointer"
          >
            <span>Descargar Clientes ({safeCustomers.length})</span>
            <Download className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Audit Logs Viewer */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h3 className="font-extrabold text-sm">Registro de Auditoría y Eventos del Sistema</h3>
          </div>
          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            title="Refrescar logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto space-y-2">
          {safeLogs.length === 0 ? (
            <div className="text-slate-500 text-center py-4">No hay eventos registrados recientemente.</div>
          ) : (
            safeLogs.map((log: any, idx: number) => (
              <div key={log.id || idx} className="flex items-start gap-2 border-b border-slate-900 pb-1.5 last:border-0">
                <span className="text-slate-500 text-[10px] shrink-0">[{log.createdAt ? String(log.createdAt).slice(11, 19) : '--:--:--'}]</span>
                <span className="text-cyan-400 font-bold text-[11px] shrink-0">{log.action || 'Evento'}:</span>
                <span className="text-slate-200 text-[11px]">{log.details || ''}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREAR USUARIO (ADMINISTRADOR O ASESOR DE VENTAS)   */}
      {/* ========================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  <span>Crear Usuario del Sistema</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Registra un Administrador o un Asesor de Ventas con código de vendedor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              {/* Selector de Rol */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Rol del Usuario *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateRole('advisor');
                      if (!createSellerCode) setCreateSellerCode(generateSellerCode());
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      createRole === 'advisor'
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
                    onClick={() => setCreateRole('admin')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      createRole === 'admin'
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
                    value={createFirstName}
                    onChange={e => {
                      const val = e.target.value;
                      setCreateFirstName(val);
                      const autoUser = formatCleanUsername(val, createLastName);
                      if (autoUser) setCreateUsername(autoUser);
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
                    value={createLastName}
                    onChange={e => {
                      const val = e.target.value;
                      setCreateLastName(val);
                      const autoUser = formatCleanUsername(createFirstName, val);
                      if (autoUser) setCreateUsername(autoUser);
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
                    value={createUsername}
                    onChange={e => setCreateUsername(e.target.value)}
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
                      onClick={() => setCreatePassword(generatePassword())}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      title="Generar contraseña aleatoria"
                    >
                      🎲 Generar
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCreatePass ? 'text' : 'password'}
                      value={createPassword}
                      onChange={e => setCreatePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePass(!showCreatePass)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showCreatePass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
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
                  value={createPhone}
                  onChange={e => setCreatePhone(e.target.value)}
                  placeholder="Ej. 3201234567"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 flex items-start gap-1.5 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-xl">
                  <span className="text-emerald-400 text-xs">💬</span>
                  <span>
                    <strong>Enrutamiento WhatsApp Rápido:</strong> Cuando un cliente pregunte en la tienda por WhatsApp, se enrutará a este número para que el asesor responda de primero y cierre la venta.
                  </span>
                </p>
              </div>

              {/* Código de Vendedor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span className="text-amber-400">🏷️</span>
                    <span>Código de Vendedor (Control del que más venda) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateSellerCode(generateSellerCode())}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    🔄 Auto-generar
                  </button>
                </div>
                <input
                  type="text"
                  value={createSellerCode}
                  onChange={e => setCreateSellerCode(e.target.value.toUpperCase())}
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
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingUser ? 'Creando...' : `Crear ${createRole === 'admin' ? 'Administrador' : 'Asesor de Ventas'}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: MODIFICAR DATOS DEL USUARIO                       */}
      {/* ========================================================= */}
      {isEditModalOpen && editTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-cyan-400" />
                  <span>Modificar Datos de Usuario</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actualiza el nombre, usuario, rol, teléfono, código de vendedor y clave.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              {/* Selector de Rol */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Rol del Usuario *</label>
                {editTargetUser.id === 'admin-master' ? (
                  <div className="p-3 rounded-2xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Administrador Master Principal (Rol fijo por seguridad)</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditRole('advisor')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        editRole === 'advisor'
                          ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">💼</span>
                        <span className="font-black text-xs text-cyan-300">Asesor de Ventas</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        Ventas Dropi y código vendedor.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditRole('admin')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        editRole === 'admin'
                          ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛡️</span>
                        <span className="font-black text-xs text-purple-300">Administrador</span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">
                        Acceso administrativo completo.
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Nombre *</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
                    placeholder="Ej. Valentina"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Apellido *</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                    placeholder="Ej. Morales"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              {/* Usuario para Ingreso & Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Usuario para Ingreso *</span>
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    placeholder="Ej. valentina.morales"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Teléfono / WhatsApp</span>
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="Ej. 3201234567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Código de Vendedor */}
              {editTargetUser.id !== 'admin-master' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <span>🏷️ Código de Vendedor</span>
                  </label>
                  <input
                    type="text"
                    value={editSellerCode}
                    onChange={e => setEditSellerCode(e.target.value.toUpperCase())}
                    placeholder="Ej. VEN-005"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono font-bold tracking-wider"
                  />
                </div>
              )}

              {/* Contraseña Opcional */}
              <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    <span>Actualizar Contraseña (Opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(generatePassword())}
                    className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                  >
                    🎲 Generar
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPass ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Dejar en blanco para conservar la actual"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-2.5 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPass(!showEditPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showEditPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SELECCIÓN MÚLTIPLE Y ELIMINACIÓN DE USUARIOS       */}
      {/* ========================================================= */}
      {isMultiSelectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-rose-500" />
                  <span>Gestión y Eliminación Múltiple de Usuarios</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selecciona uno o varios usuarios con las casillas para eliminarlos en lote del sistema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMultiSelectModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Acciones Rápidas de Selección */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllBatch}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Seleccionar Todos ({deletableUsers.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAllBatch}
                  className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Deseleccionar</span>
                </button>
              </div>

              <div className="text-xs font-mono font-bold">
                <span className="text-slate-400">Seleccionados: </span>
                <span className="text-cyan-400 font-black">{selectedBatchIds.length}</span>
                <span className="text-slate-500"> / {deletableUsers.length}</span>
              </div>
            </div>

            {/* Lista Scrollable de Usuarios */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {/* Master Admin Info Row */}
              <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-900/30 flex items-center justify-between text-xs opacity-75">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-purple-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>Sergio Martínez</span>
                      <span className="px-1.5 py-0.2 bg-purple-900/50 text-purple-300 rounded text-[10px]">Master Admin</span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">Usuario: Sergio Martinez</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-purple-300 italic">No eliminable (Master)</span>
              </div>

              {deletableUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay usuarios adicionales creados para eliminar.
                </div>
              ) : (
                deletableUsers.map(adv => {
                  const isChecked = selectedBatchIds.includes(adv.id);
                  const isAdvAdmin = adv.role === 'admin';

                  return (
                    <div
                      key={adv.id}
                      onClick={() => handleToggleBatchSelect(adv.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-rose-950/30 border-rose-500/60 shadow-sm'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-500"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs truncate">
                              {adv.name}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isAdvAdmin
                                ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30'
                                : 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              {isAdvAdmin ? 'Administrador' : 'Asesor de Ventas'}
                            </span>
                            {adv.sellerCode && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-900/40 text-amber-300 border border-amber-500/30">
                                {adv.sellerCode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>Usuario: <strong className="text-slate-300">{adv.username || adv.id}</strong></span>
                            {adv.phone && <span>• Tel: {adv.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            const sysUser = allSystemUsers.find(u => u.id === adv.id);
                            if (sysUser) handleOpenEditUserModal(sysUser);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-slate-300 rounded-lg transition-colors cursor-pointer"
                          title="Modificar datos"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const sysUser = allSystemUsers.find(u => u.id === adv.id);
                            if (sysUser) handleDeleteSingleUser(sysUser);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Barra Inferior Fija de Eliminación */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
              <span className="text-xs text-slate-400">
                {selectedBatchIds.length > 0 ? (
                  <strong className="text-rose-400">{selectedBatchIds.length} usuario(s) listos para eliminar</strong>
                ) : (
                  'Selecciona usuarios para borrarlos en lote'
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMultiSelectModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBatchDelete}
                  disabled={selectedBatchIds.length === 0 || isDeletingBatch}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingBatch ? 'Eliminando...' : `Eliminar Seleccionados (${selectedBatchIds.length})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE USUARIO INDIVIDUAL        */}
      {/* ========================================================= */}
      {userPendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">¿Eliminar Usuario del Sistema?</h3>
                <p className="text-xs text-rose-300">Esta acción revocará sus accesos de inmediato.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{userPendingDelete.name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${userPendingDelete.badgeStyle}`}>
                  {userPendingDelete.roleBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Usuario: <strong className="text-slate-200">{userPendingDelete.username}</strong>
              </p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente a este usuario? Ya no podrá iniciar sesión en la tienda.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserPendingDelete(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={isDeletingSingle}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingSingle ? 'Eliminando...' : 'Sí, Eliminar Usuario'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

