import React, { useEffect, useMemo, useState } from 'react';
import { Gift, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatCOP } from '../../utils/formatters.ts';

interface Item { id: string; title: string; originalPrice: number; campaignPrice: number; discountPercent: number }
interface State {
  active: boolean; name: string; startedAt?: string; endsAt?: string; maxDiscount: number; minMarginPercent: number;
  items: Item[]; endedAt?: string; endedReason?: 'manual' | 'automatica'; restored?: number;
  skipped?: { id: string; title: string; reason: string }[];
}
interface Row {
  id: string; title: string; category: string; price: number; cost: number; marginNow: number;
  campaignPrice: number; discountPercent: number; profitAfter: number; marginAfter: number;
  status: string; note: string; selectable: boolean;
}

const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-hidden focus:border-violet-500';
const label = 'block text-xs font-bold text-slate-600 mb-1';

/** Próximo lunes (Cyber Monday) después del Black Friday del año, en AAAA-MM-DD. */
const defaultEnd = () => {
  const y = new Date().getFullYear();
  const first = new Date(y, 10, 1);
  const bf = new Date(y, 10, 1 + ((5 - first.getDay() + 7) % 7) + 21);
  const end = new Date(y, bf.getMonth(), bf.getDate() + 3);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}`;
};

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export const AdminCampaign: React.FC = () => {
  const [state, setState] = useState<State | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [cat, setCat] = useState('juguet');
  const [maxDiscount, setMaxDiscount] = useState(20);
  const [minMargin, setMinMargin] = useState(10);
  const [marginBase, setMarginBase] = useState<'venta' | 'costo'>('venta');
  const [endsAt, setEndsAt] = useState(defaultEnd());
  const [name, setName] = useState('Black Friday');
  const [homeBlocks, setHomeBlocks] = useState(true);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    try {
      const r = await fetch('/api/admin/campaign');
      const j = await r.json();
      if (j.success) { setState(j.state); setCategories(j.categories || []); }
    } catch { /* se muestra vacío */ }
  };
  useEffect(() => { load(); }, []);

  const calculate = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/campaign/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryContains: cat, maxDiscount, minMarginPercent: minMargin, marginBase })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      setRows(j.rows);
      setPicked(new Set(j.rows.filter((x: Row) => x.selectable).map((x: Row) => x.id)));
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'No se pudo calcular.' });
    } finally { setBusy(false); }
  };

  const chosen = useMemo(() => (rows || []).filter(r => picked.has(r.id) && r.selectable), [rows, picked]);
  const bestDiscount = chosen.reduce((m, r) => Math.max(m, r.discountPercent), 0);

  const activate = async () => {
    if (chosen.length === 0) return;
    if (!window.confirm(`Se bajará el precio de ${chosen.length} producto(s) en la tienda (hasta -${bestDiscount}%) hasta el ${endsAt}. Los precios originales quedan guardados y vuelven solos. ¿Activar la campaña?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/campaign/activate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: chosen.map(c => c.id), categoryContains: cat, maxDiscount, minMarginPercent: minMargin, marginBase, endsAt, name, homeBlocks })
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      setState(j.state); setRows(null);
      setMsg({ ok: true, text: `Campaña activa con ${j.state.items.length} producto(s). Si no ves los cambios en la tienda, recarga con Ctrl+F5.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'No se pudo activar.' });
    } finally { setBusy(false); }
  };

  const end = async () => {
    if (!window.confirm('Se terminará la campaña y cada producto volverá a su precio original. ¿Continuar?')) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/campaign/end', { method: 'POST' });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      setState(j.state);
      setMsg({ ok: true, text: `Campaña terminada. Precios restaurados: ${j.state.restored ?? 0}.` });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'No se pudo terminar.' });
    } finally { setBusy(false); }
  };

  const toggle = (id: string) => setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
        <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Gift className="w-5 h-5" /></div>
        <div>
          <h2 className="text-base font-black text-slate-900">Campaña de precios (Black Friday)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Baja de verdad el precio de una categoría, sin bajar de tu ganancia mínima. El precio "antes" que se muestra es el que cobrabas, no uno inventado.
            Al terminar la fecha (o cuando tú lo pidas) los precios vuelven solos.
          </p>
        </div>
      </div>

      {msg && (
        <p className={`text-sm font-bold rounded-xl px-4 py-3 border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>{msg.text}</p>
      )}

      {state?.active ? (
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">CAMPAÑA ACTIVA</span>
              <h3 className="text-lg font-black text-slate-900 mt-1">{state.name}</h3>
              <p className="text-xs text-slate-600">
                {state.items.length} producto(s) · desde {fmtDate(state.startedAt)} · termina sola el <strong>{state.endsAt}</strong> a las 11:59 p. m.
              </p>
            </div>
            <button onClick={end} disabled={busy} className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black disabled:opacity-60 cursor-pointer">
              {busy ? 'Restaurando…' : 'Terminar campaña y restaurar precios'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500 border-b border-slate-200"><th className="py-2 pr-3">Producto</th><th className="py-2 pr-3">Precio original</th><th className="py-2 pr-3">Precio campaña</th><th className="py-2">Descuento</th></tr></thead>
              <tbody>
                {state.items.map(i => (
                  <tr key={i.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-bold text-slate-900">{i.title}</td>
                    <td className="py-2 pr-3 line-through text-slate-500">{formatCOP(i.originalPrice)}</td>
                    <td className="py-2 pr-3 font-bold">{formatCOP(i.campaignPrice)}</td>
                    <td className="py-2">-{i.discountPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {state?.endedAt && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p><strong>Última campaña:</strong> {state.name} · terminó {fmtDate(state.endedAt)} ({state.endedReason === 'automatica' ? 'por fecha' : 'a mano'}) · precios restaurados: {state.restored ?? 0}.</p>
              {(state.skipped || []).map(s => <p key={s.id} className="text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {s.title}: {s.reason}</p>)}
            </div>
          )}

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">1. Define la campaña</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className={label}>Categoría</label>
                <select className={input} value={cat} onChange={e => setCat(e.target.value)}>
                  <option value="juguet">Juguetería (todas las que digan "juguet")</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Descuento máximo (%)</label>
                <input type="number" min={1} max={60} className={input} value={maxDiscount} onChange={e => setMaxDiscount(Number(e.target.value))} />
              </div>
              <div>
                <label className={label}>Ganancia mínima que protejo (%)</label>
                <input type="number" min={0} className={input} value={minMargin} onChange={e => setMinMargin(Number(e.target.value))} />
              </div>
              <div>
                <label className={label}>La ganancia se mide sobre…</label>
                <select className={input} value={marginBase} onChange={e => setMarginBase(e.target.value as 'venta' | 'costo')}>
                  <option value="venta">El precio de venta (vendo a 100, gano 20 = 20%)</option>
                  <option value="costo">Mi costo (me cuesta 100, vendo a 120 = 20%)</option>
                </select>
              </div>
              <div>
                <label className={label}>Termina el día</label>
                <input type="date" className={input} value={endsAt} onChange={e => setEndsAt(e.target.value)} />
              </div>
              <div className="lg:col-span-2">
                <label className={label}>Nombre de la campaña</label>
                <input type="text" maxLength={60} className={input} value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={homeBlocks} onChange={e => setHomeBlocks(e.target.checked)} />
              Poner también el banner "Hasta -X%", el estante y la cinta de la portada con esta campaña (se restauran al terminar)
            </label>
            <p className="text-[11px] text-slate-500">
              La ganancia se calcula con tu costo, flete y tarifa Dropi (las casillas de "Márgenes y descuentos seguros"). Con "precio de venta" tus márgenes de hoy salen entre 20 % y 40 %. Cada producto baja hasta el descuento máximo o hasta donde llega tu ganancia mínima, lo que ocurra primero.
            </p>
            <button onClick={calculate} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
              {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} Calcular propuesta
            </button>
          </div>

          {rows && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900">2. Revisa y elige los productos</h3>
              {rows.length === 0 && <p className="text-sm text-slate-600">No hay productos en esa categoría.</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-2"></th><th className="py-2 pr-3">Producto</th><th className="py-2 pr-3">Precio hoy</th><th className="py-2 pr-3">Margen hoy</th>
                      <th className="py-2 pr-3">Precio campaña</th><th className="py-2 pr-3">Descuento</th><th className="py-2 pr-3">Ganancia / unidad</th><th className="py-2">Margen en campaña</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id} className={`border-b border-slate-100 align-top ${r.selectable ? '' : 'opacity-60'}`}>
                        <td className="py-2 pr-2"><input type="checkbox" disabled={!r.selectable} checked={picked.has(r.id) && r.selectable} onChange={() => toggle(r.id)} /></td>
                        <td className="py-2 pr-3 max-w-[240px]"><div className="font-bold text-slate-900">{r.title}</div>{r.note && <div className="text-[10px] text-amber-700">{r.note}</div>}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatCOP(r.price)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.cost > 0 ? `${r.marginNow}%` : '—'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap font-bold">{r.discountPercent > 0 ? formatCOP(r.campaignPrice) : '—'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.discountPercent > 0 ? `-${r.discountPercent}%` : '—'}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.discountPercent > 0 ? formatCOP(r.profitAfter) : '—'}</td>
                        <td className="py-2 whitespace-nowrap">{r.discountPercent > 0 ? `${r.marginAfter}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">{chosen.length} producto(s) elegidos{chosen.length ? ` · descuento más alto: -${bestDiscount}%` : ''}</p>
                <button onClick={activate} disabled={busy || chosen.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-black disabled:opacity-50 cursor-pointer">
                  <Check className="w-4 h-4" /> Activar campaña
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
