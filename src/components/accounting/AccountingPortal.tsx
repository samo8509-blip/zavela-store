import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, LogOut, Store, Layers } from 'lucide-react';
import type { Advisor } from '../../types/index.ts';
import {
  ACCOUNTING_LEVEL_LABEL,
  ACCOUNTING_MODULES,
  AccountingLevel,
  canAccessLevel
} from './accountingModules.ts';

interface AccountingPortalProps {
  user: Advisor;
  onBackToStore: () => void;
  onLogout: () => void;
}

export const AccountingPortal: React.FC<AccountingPortalProps> = ({ user, onBackToStore, onLogout }) => {
  // El token de este usuario viaja como el de los asesores (el servidor lo marca como contable).
  if (typeof window !== 'undefined') (window as any).__zavelaRole = 'advisor';

  const level: AccountingLevel = user.role === 'contador' ? 'contador' : 'auxiliar';
  const modules = useMemo(() => ACCOUNTING_MODULES.filter(m => canAccessLevel(level, m.minLevel)), [level]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (!modules.some(m => m.id === activeId)) setActiveId(modules[0]?.id || '');
  }, [modules, activeId]);

  const active = modules.find(m => m.id === activeId);

  return (
    <div className="min-h-screen bg-[#070514] text-slate-100 flex flex-col">
      <header className="bg-[#0B1528] border-b border-sky-500/30 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white truncate">Zavela Store · Contabilidad</h1>
            <p className="text-[11px] text-slate-400 truncate">
              {user.name} ·{' '}
              <span className={level === 'contador' ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                {ACCOUNTING_LEVEL_LABEL[level]}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBackToStore}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver tienda</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        <nav className="md:w-60 shrink-0 bg-[#0A1128] border-b md:border-b-0 md:border-r border-slate-800 p-3 flex md:flex-col gap-1.5 overflow-x-auto">
          {modules.length === 0 ? (
            <div className="text-[11px] text-slate-500 px-2 py-1.5">Sin módulos asignados todavía.</div>
          ) : (
            modules.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveId(m.id)}
                className={`text-left px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  m.id === activeId ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {m.title}
              </button>
            ))
          )}
        </nav>

        <main className="flex-1 p-4 sm:p-6">
          {active ? (
            active.render({ level, userName: user.name })
          ) : (
            <div className="max-w-xl mx-auto mt-10 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6 text-emerald-300" />
              </div>
              <h2 className="text-base font-black text-white">Tu espacio contable está listo</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ya ingresaste como <strong className="text-slate-200">{ACCOUNTING_LEVEL_LABEL[level]}</strong>. Los módulos de
                contabilidad se están preparando y aparecerán aquí en cuanto estén disponibles.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {level === 'contador'
                  ? 'Como Contador verás los módulos del Auxiliar contable y además los propios del Contador.'
                  : 'Como Auxiliar contable verás los módulos básicos de contabilidad.'}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
