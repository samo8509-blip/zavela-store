import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  X, 
  Plus, 
  RefreshCw, 
  Trash2, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Package, 
  HardDrive,
  Info
} from 'lucide-react';

export interface CatalogBackupItem {
  id: number;
  nombre?: string;
  nombre_respaldo: string;
  total_productos: number;
  origen: string;
  created_at: string;
}

interface CatalogBackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
  totalCurrentProducts: number;
}

export const CatalogBackupsModal: React.FC<CatalogBackupsModalProps> = ({
  isOpen,
  onClose,
  onRestoreSuccess,
  totalCurrentProducts
}) => {
  const [backups, setBackups] = useState<CatalogBackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      const list = data.backups || data.data || [];
      if (data.success && Array.isArray(list)) {
        setBackups(list.map((b: any) => ({
          ...b,
          nombre_respaldo: b.nombre_respaldo || b.nombre || `Respaldo #${b.id}`
        })));
      } else {
        setBackups([]);
      }
    } catch (err: any) {
      console.warn('Error al cargar respaldos:', err);
      showToast('No se pudo cargar la lista de respaldos', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen, fetchBackups]);

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: 'manual'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Respaldo creado con éxito (${data.backup?.total_productos || data.data?.total_productos || totalCurrentProducts} productos guardados).`, 'success');
        await fetchBackups();
      } else {
        throw new Error(data.message || 'Error al generar el respaldo');
      }
    } catch (err: any) {
      console.error('Error al crear respaldo:', err);
      showToast(err.message || 'Error al generar respaldo en MySQL', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestoreBackup = async (backup: CatalogBackupItem) => {
    const backupName = backup.nombre_respaldo || backup.nombre || `Respaldo #${backup.id}`;
    const confirmed = window.confirm(
      `¿Estás seguro de restaurar este respaldo?\n\n"${backupName}"\nContiene: ${backup.total_productos} productos.\n\n` +
      `Se restablecerán los productos, imágenes, variantes y códigos Dropi guardados en esta copia en MySQL. Esta acción actualizará tu tienda.`
    );

    if (!confirmed) return;

    setRestoringId(backup.id);
    try {
      const res = await fetch(`/api/backups/${backup.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (data.success) {
        showToast(`✓ Catálogo restaurado con éxito. Se recuperaron ${data.restoredCount || backup.total_productos} productos.`, 'success');
        // Notificar al componente padre para que recargue la lista de productos
        onRestoreSuccess();
      } else {
        throw new Error(data.message || 'Error al restaurar respaldo');
      }
    } catch (err: any) {
      console.error('Error al restaurar respaldo:', err);
      showToast(err.message || 'Fallo durante la restauración del catálogo', 'error');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteBackup = async (backup: CatalogBackupItem) => {
    const backupName = backup.nombre_respaldo || backup.nombre || `Respaldo #${backup.id}`;
    const confirmed = window.confirm(
      `¿Deseas eliminar el respaldo "${backupName}"?\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    setDeletingId(backup.id);
    try {
      const res = await fetch(`/api/backups/${backup.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        showToast('Respaldo eliminado correctamente.', 'success');
        setBackups(prev => prev.filter(b => b.id !== backup.id));
      } else {
        throw new Error(data.message || 'Error al eliminar');
      }
    } catch (err: any) {
      console.error('Error al eliminar respaldo:', err);
      showToast(err.message || 'Error al eliminar respaldo', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ' a las ' + d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] uppercase font-mono tracking-wider">
                  SISTEMA DE SEGURIDAD
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  MySQL catalog_backups
                </span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
                Respaldos de Emergencia del Catálogo
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-5 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 leading-relaxed">
            Guarda una instantánea completa de tu catálogo actual (fotos, precios, variantes, stock y códigos Dropi). 
            Ante cualquier desincronización o borrado accidental, puedes <strong>Restaurar</strong> cualquier punto en el tiempo con un solo clic.
          </p>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div className={`mx-5 mt-4 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold border transition-all ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              Catálogo actual en tienda:
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-900 font-black font-mono text-xs">
              {totalCurrentProducts} productos
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBackups}
              disabled={isLoading}
              title="Recargar historial de respaldos"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-600' : ''}`} />
            </button>

            <button
              id="btn-crear-respaldo-ahora"
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 active:scale-98 text-amber-400 font-black text-xs shadow-md border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Guardando Respaldo...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Crear Respaldo Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Backups List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading && backups.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs font-bold">Consultando respaldos en MySQL...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                <HardDrive className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                No hay respaldos de emergencia guardados
              </h4>
              <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                Haz clic en el botón <strong>"Crear Respaldo Ahora"</strong> para guardar una copia de seguridad segura de tus {totalCurrentProducts} productos con sus Dropi IDs.
              </p>
              <button
                onClick={handleCreateBackup}
                disabled={isCreating}
                className="px-4 py-2 rounded-xl bg-slate-950 text-amber-400 font-bold text-xs hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Crear Primer Respaldo
              </button>
            </div>
          ) : (
            backups.map((item, idx) => {
              const isRestoringThis = restoringId === item.id;
              const isDeletingThis = deletingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        #{item.id}
                      </span>
                      <h4 className="text-xs font-black text-slate-900">
                        {item.nombre_respaldo}
                      </h4>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          Más reciente
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 font-medium">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">{item.total_productos} productos</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.origen}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <button
                      onClick={() => handleRestoreBackup(item)}
                      disabled={isRestoringThis || isDeletingThis}
                      title="Restaurar productos a partir de este respaldo"
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isRestoringThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Restaurando...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar este Respaldo</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteBackup(item)}
                      disabled={isRestoringThis || isDeletingThis}
                      title="Eliminar este respaldo"
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isDeletingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Respaldos almacenados permanentemente en la base de datos MySQL.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
