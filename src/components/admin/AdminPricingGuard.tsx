import React, { useMemo, useState } from 'react';
import { Percent, Save, Check, Search, AlertTriangle, TrendingDown, HelpCircle, Calculator } from 'lucide-react';
import { Product, StoreSettings, PricingGuardSettings } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import {
  analyzeProduct, resolveGuard, ceil100, profitAt, marginAt, GuardStatus, GuardRow
} from '../../utils/pricingGuard.ts';

interface Props {
  settings: StoreSettings;
  products: Product[];
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  /** Guarda el producto completo (no parcial) para no borrar sus costos. */
  onSaveProduct: (product: Partial<Product>) => Promise<any>;
}

const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-hidden focus:border-emerald-500';
const label = 'block text-xs font-bold text-slate-600 mb-1';

const STATUS: Record<GuardStatus, { text: string; cls: string }> = {
  ok: { text: 'Margen sano', cls: 'bg-emerald-100 text-emerald-800' },
  bajo: { text: 'Margen bajo', cls: 'bg-amber-100 text-amber-800' },
  perdida: { text: 'Pierdes plata', cls: 'bg-rose-100 text-rose-800' },
  sin_costo: { text: 'Falta el costo', cls: 'bg-slate-200 text-slate-700' }
};

export const AdminPricingGuard: React.FC<Props> = ({ settings, products, onSaveSettings, onSaveProduct }) => {
  const [cfg, setCfg] = useState<PricingGuardSettings>(resolveGuard(settings.pricingGuard));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'todos' | GuardStatus | 'desc'>('todos');
  const [onlyActive, setOnlyActive] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [simId, setSimId] = useState('');
  const [simPct, setSimPct] = useState(20);

  const guard = useMemo(() => resolveGuard(cfg), [cfg]);

  const rows = useMemo<GuardRow[]>(
    () => products.filter(p => (onlyActive ? p.active !== false : true)).map(p => analyzeProduct(p, guard)),
    [products, guard, onlyActive]
  );

  const counts = useMemo(() => {
    const c = { ok: 0, bajo: 0, perdida: 0, sin_costo: 0, desc: 0 };
    rows.forEach(r => { c[r.status]++; if (r.discountMismatch || (r.shownDiscount > 0 && r.status !== 'ok' && r.status !== 'sin_costo')) c.desc++; });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter(r => !term || String(r.product.title || '').toLowerCase().includes(term))
      .filter(r => {
        if (filter === 'todos') return true;
        if (filter === 'desc') return r.discountMismatch || (r.shownDiscount > 0 && r.status !== 'ok' && r.status !== 'sin_costo');
        return r.status === filter;
      })
      .sort((a, b) => {
        const order = { perdida: 0, bajo: 1, sin_costo: 2, ok: 3 } as const;
        return order[a.status] - order[b.status] || a.margin - b.margin;
      });
  }, [rows, q, filter]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const clean: PricingGuardSettings = {
        ...guard,
        minMarginPercent: Math.min(500, Math.max(0, Number(guard.minMarginPercent) || 0)),
        codFeePercent: Math.min(30, Math.max(0, Number(guard.codFeePercent) || 0))
      };
      await onSaveSettings({ pricingGuard: clean });
      setCfg(clean);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const raiseToMinimum = async (r: GuardRow) => {
    if (!Number.isFinite(r.minPrice) || r.minPrice <= 0) return;
    const newPrice = ceil100(r.minPrice);
    const p = r.product;
    const compareAt = Number(p.compareAtPrice) || 0;
    // Si el precio tachado queda por debajo del nuevo precio, se quita (no puede haber "descuento" negativo).
    const keepCompare = compareAt > newPrice;
    setBusyId(String(p.id));
    setMsg('');
    try {
      await onSaveProduct({
        ...p,
        price: newPrice,
        compareAtPrice: keepCompare ? compareAt : 0,
        discountPercentage: keepCompare ? Math.round((1 - newPrice / compareAt) * 100) : 0
      });
      setMsg(`Precio de "${p.title}" subido a ${formatCOP(newPrice)}.`);
    } catch (e: any) {
      setMsg(`No se pudo guardar: ${e?.message || 'error'}`);
    } finally {
      setBusyId(null);
    }
  };

  const sim = rows.find(r => String(r.product.id) === simId) || null;
  const simPrice = sim ? Math.round(sim.price * (1 - Math.min(95, Math.max(0, simPct)) / 100)) : 0;
  const simProfit = sim ? profitAt(sim.product, guard, simPrice) : 0;
  const simMargin = sim ? marginAt(sim.product, guard, simPrice) : 0;
  const simOk = sim ? simMargin + 1e-9 >= guard.minMarginPercent && simProfit >= 0 : false;

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-start gap-3">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Percent className="w-5 h-5" /></div>
        <div>
          <h2 className="text-base font-black text-slate-900">Márgenes y descuentos seguros</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calcula tu ganancia real por producto con tus costos, te avisa cuando un precio o descuento te deja sin ganancia y te dice hasta cuánto puedes descontar.
          </p>
        </div>
      </div>

      {/* Reglas */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900">1. Tus reglas de ganancia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Margen mínimo a proteger (%)</label>
            <input type="number" min={0} className={input} value={cfg.minMarginPercent}
              onChange={e => setCfg({ ...cfg, minMarginPercent: Number(e.target.value) })} />
          </div>
          <div>
            <label className={label}>El porcentaje se calcula sobre…</label>
            <select className={input} value={cfg.marginBase} onChange={e => setCfg({ ...cfg, marginBase: e.target.value as 'costo' | 'venta' })}>
              <option value="costo">El costo (cuesta 100, vendo a 125 = 25%)</option>
              <option value="venta">El precio de venta (vendo a 100, gano 25)</option>
            </select>
          </div>
          <div>
            <label className={label}>Comisión de recaudo contra entrega (%)</label>
            <input type="number" min={0} max={30} step={0.1} className={input} value={cfg.codFeePercent}
              onChange={e => setCfg({ ...cfg, codFeePercent: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cfg.includeShipping} onChange={e => setCfg({ ...cfg, includeShipping: e.target.checked })} />
            Sumar el flete al costo
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cfg.includePlatformFee} onChange={e => setCfg({ ...cfg, includePlatformFee: e.target.checked })} />
            Sumar la tarifa Dropi / plataforma al costo
          </label>
        </div>
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Si el flete ya viene dentro del costo del proveedor, desmarca "Sumar el flete" para no contarlo dos veces. Los costos salen de cada producto (costo, flete y tarifa).
        </p>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saved ? 'Guardado' : 'Guardar reglas'}
        </button>
      </div>

      {/* Simulador */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Calculator className="w-4 h-4" /> 2. Simulador: ¿puedo ofrecer este descuento?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className={label}>Producto</label>
            <select className={input} value={simId} onChange={e => setSimId(e.target.value)}>
              <option value="">Elige un producto…</option>
              {rows.map(r => <option key={String(r.product.id)} value={String(r.product.id)}>{r.product.title}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Descuento sobre el precio actual (%)</label>
            <input type="number" min={0} max={95} className={input} value={simPct} onChange={e => setSimPct(Number(e.target.value))} />
          </div>
        </div>
        {sim && (
          sim.status === 'sin_costo' ? (
            <p className="text-sm text-slate-600">Este producto no tiene costo guardado, así que no se puede calcular. Agrégalo en el catálogo de productos.</p>
          ) : (
            <div className={`rounded-xl p-4 text-sm border ${simOk ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <div className="font-bold">
                {simOk ? 'Sí puedes ofrecer ese descuento.' : 'Ese descuento te deja por debajo de tu margen mínimo.'}
              </div>
              <div className="mt-1">
                Precio con descuento: <strong>{formatCOP(simPrice)}</strong> · Ganancia: <strong>{formatCOP(Math.round(simProfit))}</strong> · Margen: <strong>{simMargin.toFixed(1)}%</strong>
              </div>
              <div className="mt-1 text-xs">
                Precio mínimo para proteger el {guard.minMarginPercent}%: <strong>{Number.isFinite(sim.minPrice) ? formatCOP(ceil100(sim.minPrice)) : 'imposible con estas reglas'}</strong>
                {' '}· Descuento máximo seguro: <strong>{sim.maxDiscountFromPrice}%</strong>
              </div>
            </div>
          )
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900">3. Tus productos</h3>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {([
            ['todos', `Todos (${rows.length})`, 'bg-slate-100 text-slate-700'],
            ['perdida', `Pierdes plata (${counts.perdida})`, 'bg-rose-100 text-rose-800'],
            ['bajo', `Margen bajo (${counts.bajo})`, 'bg-amber-100 text-amber-800'],
            ['sin_costo', `Sin costo (${counts.sin_costo})`, 'bg-slate-200 text-slate-700'],
            ['ok', `Sanos (${counts.ok})`, 'bg-emerald-100 text-emerald-800'],
            ['desc', `Descuento a revisar (${counts.desc})`, 'bg-violet-100 text-violet-800']
          ] as const).map(([k, t, c]) => (
            <button key={k} onClick={() => setFilter(k as any)}
              className={`px-3 py-1.5 rounded-full cursor-pointer ${c} ${filter === k ? 'ring-2 ring-slate-900' : ''}`}>{t}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input className={input + ' pl-9'} placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} /> Solo activos
          </label>
        </div>
        {msg && <p className="text-xs font-bold text-emerald-700">{msg}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Producto</th>
                <th className="py-2 pr-3">Costo total</th>
                <th className="py-2 pr-3">Precio</th>
                <th className="py-2 pr-3">Ganancia</th>
                <th className="py-2 pr-3">Margen</th>
                <th className="py-2 pr-3">Precio mínimo</th>
                <th className="py-2 pr-3">Descuento máx. seguro</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, 200).map(r => {
                const st = STATUS[r.status];
                const needsFix = (r.status === 'perdida' || r.status === 'bajo') && Number.isFinite(r.minPrice) && r.minPrice > 0;
                return (
                  <tr key={String(r.product.id)} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 max-w-[220px]">
                      <div className="font-bold text-slate-900 line-clamp-2">{r.product.title}</div>
                      {r.shownDiscount > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          {r.discountMismatch && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          Tachado {formatCOP(r.compareAt)} (-{r.shownDiscount}%){r.discountMismatch ? ` · guardado: ${r.product.discountPercentage || 0}%` : ''}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.status === 'sin_costo' ? '—' : formatCOP(Math.round(r.totalCost))}</td>
                    <td className="py-2 pr-3 whitespace-nowrap font-bold">{formatCOP(r.price)}</td>
                    <td className={`py-2 pr-3 whitespace-nowrap font-bold ${r.profit < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                      {r.status === 'sin_costo' ? '—' : formatCOP(Math.round(r.profit))}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.status === 'sin_costo' ? '—' : `${r.margin.toFixed(1)}%`}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.status === 'sin_costo' || !Number.isFinite(r.minPrice) ? '—' : formatCOP(ceil100(r.minPrice))}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {r.status === 'sin_costo' ? '—' : r.status === 'perdida' || r.status === 'bajo' ? <span className="text-rose-700 font-bold flex items-center gap-1"><TrendingDown className="w-3 h-3" />0%</span> : `${r.maxDiscountFromPrice}%`}
                    </td>
                    <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.text}</span></td>
                    <td className="py-2 text-right">
                      {needsFix && (
                        <button
                          onClick={() => raiseToMinimum(r)}
                          disabled={busyId === String(r.product.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        >
                          {busyId === String(r.product.id) ? 'Guardando…' : `Subir a ${formatCOP(ceil100(r.minPrice))}`}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">No hay productos con ese filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {visible.length > 200 && <p className="text-[11px] text-slate-500">Mostrando los primeros 200. Usa el buscador o los filtros para ver el resto.</p>}
      </div>
    </div>
  );
};
