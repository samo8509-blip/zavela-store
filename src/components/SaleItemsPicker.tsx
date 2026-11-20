import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus, Trash2, PackageX } from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';

export interface SaleLine { productId: string; title: string; price: number; stock: number; quantity: number }

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const lineFromProduct = (p: Product, quantity = 1): SaleLine => ({
  productId: String(p.id), title: p.title, price: Number(p.price) || 0, stock: Number((p as any).stock ?? 0), quantity
});
export const linesTotal = (lines: SaleLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
export const linesPayload = (lines: SaleLine[]) => lines.map(l => ({ productId: l.productId, title: l.title, quantity: l.quantity }));

/** Productos del catálogo: usa los recibidos o, si no llegan, los pide a la tienda. */
export function useCatalog(given?: Product[]): Product[] {
  const [loaded, setLoaded] = useState<Product[]>([]);
  useEffect(() => {
    if (given && given.length) return;
    fetch('/api/admin/products').then(r => r.json()).then(j => {
      const list = Array.isArray(j) ? j : (j.data || j.products || []);
      setLoaded(list);
    }).catch(() => {});
  }, [given?.length]);
  return given && given.length ? given : loaded;
}

interface Props {
  products?: Product[];
  lines: SaleLine[];
  onChange: (lines: SaleLine[]) => void;
}

export const SaleItemsPicker: React.FC<Props> = ({ products, lines, onChange }) => {
  const catalog = useCatalog(products).filter(p => (p as any).active !== false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const list = words.length ? catalog.filter(p => { const t = norm(p.title); return words.every(w => t.includes(w)); }) : catalog;
    return list.slice(0, 8);
  }, [q, catalog]);

  const add = (p: Product) => {
    const stock = Number((p as any).stock ?? 0);
    if (stock <= 0) return;
    const id = String(p.id);
    const ex = lines.find(l => l.productId === id);
    onChange(ex
      ? lines.map(l => l.productId === id ? { ...l, quantity: Math.min(l.stock, l.quantity + 1) } : l)
      : [...lines, lineFromProduct(p)]);
    setQ(''); setOpen(false);
  };
  const setQty = (id: string, qty: number) =>
    onChange(lines.map(l => l.productId === id ? { ...l, quantity: Math.max(1, Math.min(l.stock || 1, qty)) } : l));

  return (
    <div className="space-y-3">
      <div ref={box} className="relative">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (results[0]) add(results[0]); } }}
            placeholder={catalog.length ? 'Busca o elige un producto para agregarlo…' : 'Cargando productos…'}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 text-xs text-white placeholder:text-slate-500 outline-none"
          />
        </div>
        {open && (
          <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-xl bg-slate-900 border border-slate-700 shadow-2xl">
            {results.length === 0 && <div className="p-3 text-xs text-slate-400">No hay productos que coincidan con “{q}”.</div>}
            {results.map(p => {
              const stock = Number((p as any).stock ?? 0);
              const out = stock <= 0;
              return (
                <button key={String(p.id)} type="button" disabled={out} onClick={() => add(p)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 border-b border-slate-800 last:border-0 ${out ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-800 cursor-pointer'}`}>
                  <span className="text-xs text-white truncate">{p.title}</span>
                  <span className="text-[11px] font-mono shrink-0 text-slate-300">
                    {formatCOP(Number(p.price) || 0)} · {out ? <span className="text-rose-400">Agotado</span> : <span className={stock <= 3 ? 'text-amber-400' : 'text-emerald-400'}>{stock} disp.</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 border border-dashed border-slate-700 rounded-xl p-3">
          <PackageX className="w-4 h-4" /> Aún no hay productos en esta venta. Puedes agregar varios.
        </div>
      ) : (
        <div className="space-y-2">
          {lines.map(l => (
            <div key={l.productId} className="flex items-center gap-2 rounded-xl bg-slate-950 border border-slate-800 p-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{l.title}</div>
                <div className="text-[11px] text-slate-400 font-mono">{formatCOP(l.price)} c/u · quedan {l.stock}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setQty(l.productId, l.quantity - 1)} className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center cursor-pointer"><Minus className="w-3 h-3" /></button>
                <input type="number" min={1} max={l.stock} value={l.quantity} onChange={e => setQty(l.productId, parseInt(e.target.value) || 1)}
                  className="w-12 text-center bg-slate-900 border border-slate-700 rounded-lg py-1 text-xs text-white font-mono font-bold" />
                <button type="button" onClick={() => setQty(l.productId, l.quantity + 1)} className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center cursor-pointer"><Plus className="w-3 h-3" /></button>
              </div>
              <div className="w-24 text-right text-xs font-mono font-bold text-emerald-300">{formatCOP(l.price * l.quantity)}</div>
              <button type="button" onClick={() => onChange(lines.filter(x => x.productId !== l.productId))} className="text-rose-400 hover:text-rose-300 cursor-pointer" title="Quitar"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold text-white px-1 pt-1">
            <span>Total a cobrar</span><span className="font-mono text-emerald-300">{formatCOP(linesTotal(lines))}</span>
          </div>
        </div>
      )}
    </div>
  );
};
