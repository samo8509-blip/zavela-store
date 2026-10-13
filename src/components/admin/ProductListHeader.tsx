import React from 'react';
import { Database, BookOpen, RefreshCw, Boxes, Plus } from 'lucide-react';

export interface ProductListHeaderProps {
  productsCount: number;
  onOpenBackups: () => void;
  onOpenMagazine: () => void;
  onSync: () => void;
  onNavigateToDropiImporter?: () => void;
  onCreateProduct: () => void;
}

export const ProductListHeader: React.FC<ProductListHeaderProps> = ({
  productsCount,
  onOpenBackups,
  onOpenMagazine,
  onSync,
  onNavigateToDropiImporter,
  onCreateProduct
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs w-full">
      {/* Información del Catálogo */}
      <div className="shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            INVENTARIO & CATÁLOGO
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
            <Database className="w-3 h-3 text-emerald-600" />
            <span>cPanel MySQL Conectado</span>
          </span>
        </div>
        <h2 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
          <span>Administrador de Productos</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold font-mono">
            {productsCount} {productsCount === 1 ? 'producto' : 'productos'}
          </span>
        </h2>
        <p className="text-xs text-slate-500">
          Catálogo persistido en la base de datos MySQL de tu servidor cPanel con soporte multi-proveedor (Dropi, DeRocha, Bodegas directas).
        </p>
      </div>

      {/* Botonera Superior Adaptativa y Centrada - Sin desbordamientos */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 max-w-full">
        <button
          id="btn-respaldos-emergencia"
          onClick={onOpenBackups}
          type="button"
          title="Gestionar respaldos de emergencia del catálogo y restauración en MySQL"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs shadow-md border border-slate-700 hover:border-amber-400/40 transition-all cursor-pointer shrink-0"
        >
          <Database className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">💾 Respaldos de Emergencia</span>
          <span className="sm:hidden">💾 Respaldos</span>
        </button>

        <button
          onClick={onOpenMagazine}
          type="button"
          title="Generar y descargar revista digital tipo Yanbal en PDF con los productos del catálogo"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0"
        >
          <BookOpen className="w-4 h-4 text-amber-200" />
          <span className="hidden sm:inline">Revista Catálogo PDF</span>
          <span className="sm:hidden">Revista PDF</span>
        </button>

        <button
          onClick={onSync}
          type="button"
          title="Refrescar y sincronizar con cPanel MySQL"
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer shrink-0 border border-slate-200"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span className="hidden sm:inline">Sincronizar</span>
        </button>

        {onNavigateToDropiImporter && (
          <button
            onClick={onNavigateToDropiImporter}
            type="button"
            title="Importar catálogo masivo de Dropi con cotizador y ajuste de márgenes"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white font-black text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
          >
            <Boxes className="w-4 h-4 text-cyan-200" />
            <span className="hidden md:inline">Importador Dropi (Masivo)</span>
            <span className="md:hidden">Importar Dropi</span>
          </button>
        )}

        {/* Botón Principal: Siempre visible, destacado y sin desbordarse */}
        <button
          onClick={onCreateProduct}
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0 ring-2 ring-cyan-400/50"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Crear Nuevo Producto</span>
        </button>
      </div>
    </div>
  );
};
