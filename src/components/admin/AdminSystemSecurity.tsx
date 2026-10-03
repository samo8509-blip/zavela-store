import React, { useState, useEffect } from 'react';
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
  Terminal
} from 'lucide-react';
import { Product, Order, Customer, AuditLog } from '../../types/index.ts';

interface AdminSystemSecurityProps {
  products?: Product[];
  orders?: Order[];
  customers?: Customer[];
  onRefreshAll?: () => void;
}

export const AdminSystemSecurity: React.FC<AdminSystemSecurityProps> = ({
  products = [],
  orders = [],
  customers = [],
  onRefreshAll = () => {}
}) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

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
    if (!newPassword || newPassword !== confirmPassword) {
      alert('La nueva contraseña y su confirmación no coinciden.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: newPassword })
      });
      if (!res.ok) throw new Error('Error al actualizar contraseña');

      alert('Contraseña del panel de administración actualizada exitosamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchLogs();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar contraseña.');
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
        
        {/* Change Admin Password */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Lock className="w-4 h-4 text-cyan-600" />
            <h3 className="font-extrabold text-sm">Cambiar Clave de Acceso Secreto</h3>
          </div>
          <p className="text-xs text-slate-500">
            Esta clave se solicita al presionar la combinación secreta <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold">Ctrl + 1985</kbd>.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nueva Contraseña de Administrador</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa la nueva clave..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors cursor-pointer"
            >
              {isChangingPass ? 'Actualizando clave...' : 'Guardar Nueva Contraseña'}
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

    </div>
  );
};

