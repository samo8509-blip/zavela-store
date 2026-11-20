import React, { useEffect, useMemo, useState } from 'react';
import { Wallet, RefreshCw, CheckCircle2, Clock, Truck, BadgeDollarSign, Undo2, Loader2, AlertTriangle } from 'lucide-react';
import { AdvisorSale } from '../../types/index.ts';
import { AdminSettlements } from './AdminSettlements.tsx';
import { formatCOP } from '../../utils/formatters.ts';

type CStatus = NonNullable<AdvisorSale['commissionStatus']>;

const STATUS_INFO: Record<CStatus, { label: string; chip: string; help: string }> = {
  en_proceso: { label: 'En proceso', chip: 'bg-slate-100 text-slate-700 border-slate-200', help: 'El pedido aún no se entrega.' },
  esperando_dropi: { label: 'Esperando pago de Dropi', chip: 'bg-amber-100 text-amber-800 border-amber-300', help: 'Entregado; falta que Dropi te pague.' },
  por_pagar: { label: 'Por pagar al asesor', chip: 'bg-emerald-100 text-emerald-800 border-emerald-300', help: 'Dropi ya pagó; la comisión está lista para liquidar.' },
  pagada: { label: 'Pagada', chip: 'bg-violet-100 text-violet-800 border-violet-300', help: 'Ya se liquidó al asesor.' },
  anulada: { label: 'Anulada', chip: 'bg-rose-100 text-rose-700 border-rose-200', help: 'Pedido cancelado o devuelto.' }
};

interface Props { onGoToOrders?: () => void }

export const AdminCommissions: React.FC<Props> = ({ onGoToOrders }) => {
  const [rows, setRows] = useState<AdvisorSale[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [advisorFilter, setAdvisorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CStatus>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/advisor-commissions');
      const json = await res.json();
      if (json.success) { setRows(json.data || []); setTotals(json.totals || {}); }
    } catch {
      setMessage({ ok: false, text: 'No se pudo cargar la información.' });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const advisors = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach(r => map.set(r.advisorId, `${r.advisorName}${r.sellerCode ? ` (${r.sellerCode})` : ''}`));
    return [...map.entries()];
  }, [rows]);

  const visible = useMemo(() => rows.filter(r =>
    (advisorFilter === 'all' || r.advisorId === advisorFilter) && (statusFilter === 'all' || r.commissionStatus === statusFilter)
  ), [rows, advisorFilter, statusFilter]);

  const countBy = (st: CStatus) => rows.filter(r => r.commissionStatus === st).length;
  const selectable = visible.filter(r => r.commissionStatus === 'esperando_dropi').map(r => r.id);
  const allSelected = selectable.length > 0 && selectable.every(id => selected.includes(id));

  const markPaid = async () => {
    if (!selected.length) return;
    setBusy(true); setMessage(null);
    try {
      const res = await fetch('/api/admin/advisor-commissions/dropi-paid', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: selected })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'No se pudo marcar.');
      const skipped = (json.skipped || []) as { orderId: string; reason: string }[];
      setMessage({
        ok: skipped.length === 0,
        text: `${json.ok.length} pedido(s) marcados como pagados por Dropi; su comisión quedó lista para pagar.` +
          (skipped.length ? ` No se pudieron marcar ${skipped.length}: ${skipped.map(s => s.reason).filter((v, i, a) => a.indexOf(v) === i).join(' ')}` : '')
      });
      setSelected([]);
      await load();
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || 'Error al marcar.' });
    } finally { setBusy(false); }
  };

  const undo = async (id: string) => {
    if (!window.confirm('¿Quitar la marca "Dropi ya pagó" de este pedido?')) return;
    await fetch('/api/admin/advisor-commissions/undo-dropi-paid', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderIds: [id] })
    });
    await load();
  };

  const card = (title: string, value: number, count: number, tone: string, icon: React.ReactNode) => (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide opacity-80"><span>{title}</span>{icon}</div>
      <div className="mt-2 text-xl font-black font-mono">{formatCOP(value)}</div>
      <div className="text-[11px] opacity-70">{count} pedido{count === 1 ? '' : 's'}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-violet-600" /> Liquidación de Comisiones de Asesores</h2>
          <p className="text-xs text-slate-500 mt-1">Cada comisión es un % de la <strong>rentabilidad neta real</strong> del pedido. Solo se puede pagar cuando el pedido está <strong>Entregado</strong> y tú marcas que <strong>Dropi ya te pagó</strong>.</p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {card('En proceso', totals.en_proceso || 0, countBy('en_proceso'), 'bg-slate-50 border-slate-200 text-slate-800', <Truck className="w-4 h-4" />)}
        {card('Esperando pago de Dropi', totals.esperando_dropi || 0, countBy('esperando_dropi'), 'bg-amber-50 border-amber-200 text-amber-900', <Clock className="w-4 h-4" />)}
        {card('Por pagar a asesores', totals.por_pagar || 0, countBy('por_pagar'), 'bg-emerald-50 border-emerald-200 text-emerald-900', <BadgeDollarSign className="w-4 h-4" />)}
        {card('Pagadas', totals.pagada || 0, countBy('pagada'), 'bg-violet-50 border-violet-200 text-violet-900', <CheckCircle2 className="w-4 h-4" />)}
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${message.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {message.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}<span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100">
          <div className="flex flex-wrap gap-2">
            <select value={advisorFilter} onChange={e => setAdvisorFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50">
              <option value="all">Todos los asesores</option>
              {advisors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            {(['all', 'en_proceso', 'esperando_dropi', 'por_pagar', 'pagada'] as const).map(st => (
              <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${statusFilter === st ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                {st === 'all' ? 'Todas' : STATUS_INFO[st].label}
              </button>
            ))}
          </div>
          <button
            onClick={markPaid}
            disabled={!selected.length || busy}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-2 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeDollarSign className="w-4 h-4" />}
            Dropi ya pagó ({selected.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-900 text-slate-200">
              <tr className="text-left">
                <th className="p-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : selectable)} title="Seleccionar los que esperan pago de Dropi" />
                </th>
                <th className="p-3">Pedido</th><th className="p-3">Asesor</th><th className="p-3">Cliente</th>
                <th className="p-3 text-right">Total</th><th className="p-3 text-right">Comisión</th><th className="p-3">Estado de la comisión</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-500">
                  Aún no hay ventas de asesores. Cuando un asesor registre una venta, aparecerá aquí.
                  {onGoToOrders && <> <button onClick={onGoToOrders} className="text-cyan-700 font-bold underline cursor-pointer">Ir al Centro de Despachos</button></>}
                </td></tr>
              )}
              {visible.map(r => {
                const info = STATUS_INFO[r.commissionStatus || 'en_proceso'];
                const canPick = r.commissionStatus === 'esperando_dropi';
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="p-3"><input type="checkbox" disabled={!canPick} checked={selected.includes(r.id)} onChange={() => setSelected(s => s.includes(r.id) ? s.filter(x => x !== r.id) : [...s, r.id])} /></td>
                    <td className="p-3 font-mono font-bold">{r.orderNumber}</td>
                    <td className="p-3"><div className="font-bold text-slate-800">{r.advisorName}</div><div className="text-[10px] font-mono text-slate-500">{r.sellerCode} · {r.commissionRate}%</div></td>
                    <td className="p-3"><div className="font-semibold">{r.clientName}</div><div className="text-[10px] text-slate-500">{r.productTitle}</div></td>
                    <td className="p-3 text-right font-mono">{formatCOP(r.totalAmount)}</td>
                    <td className="p-3 text-right font-mono font-bold">
                      {r.commissionAmount == null ? <span className="text-amber-600" title="Falta el costo del producto">sin costo</span> : formatCOP(r.commissionAmount)}
                      {r.commissionAmount != null && !r.commissionFrozen && <div className="text-[9px] font-sans font-normal text-slate-400">estimada</div>}
                    </td>
                    <td className="p-3"><span title={info.help} className={`px-2 py-1 rounded-full border text-[10px] font-bold ${info.chip}`}>{info.label}</span></td>
                    <td className="p-3 text-right">
                      {r.commissionStatus === 'por_pagar' && (
                        <button onClick={() => undo(r.id)} title="Quitar la marca Dropi ya pagó" className="text-slate-400 hover:text-rose-600 cursor-pointer"><Undo2 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AdminSettlements onChanged={load} />
    </div>
  );
};
