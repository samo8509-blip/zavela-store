import React, { useEffect, useState } from 'react';
import { Banknote, Mail, Loader2, CalendarClock, History } from 'lucide-react';
import { formatCOP } from '../../utils/formatters.ts';

interface Row {
  advisorId: string; name: string; email: string; sellerCode: string; rate: number;
  cycle: 'quincenal' | 'mensual'; nextCutoff: string; payDate: string; daysToCutoff: number; payoutDelayDays: number;
  porPagar: number; porPagarCount: number; esperandoDropi: number; enProceso: number; pagada: number; pagadaCount: number;
}
interface Settlement {
  id: string; advisorId: string; advisorName: string; sellerCode: string; count: number; total: number;
  periodFrom: string; periodTo: string; method: string; reference: string; paidAt: string; emailed: boolean;
}

const fmt = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y) return '—';
  return `${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]} ${y}`;
};

export const AdminSettlements: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [target, setTarget] = useState<Row | null>(null);
  const [method, setMethod] = useState('Transferencia');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([fetch('/api/admin/advisor-settlements/summary'), fetch('/api/admin/advisor-settlements')]);
      const ja = await a.json(), jb = await b.json();
      if (ja.success) setRows(ja.data || []);
      if (jb.success) setHistory(jb.data || []);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const liquidate = async () => {
    if (!target) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/admin/advisor-settlements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advisorId: target.advisorId, method, reference, notes })
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'No se pudo liquidar.');
      setMsg({
        ok: true,
        text: `Liquidación ${json.data.id} registrada por ${formatCOP(json.data.total)}. ` +
          (json.data.emailed ? `Se envió el estado de cuenta a ${target.email}.` : `No se envió el correo: ${json.emailNote || 'sin detalle'}.`)
      });
      setTarget(null); setReference(''); setNotes('');
      await load(); onChanged?.();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm"><CalendarClock className="w-4 h-4 text-cyan-600" /> Liquidar comisiones por asesor</h3>
        <p className="text-[11px] text-slate-500">Se paga lo que está en <strong>Por pagar</strong> (pedido Entregado y Dropi ya pagó). Al liquidar, el asesor recibe el detalle por correo.</p>
        {msg && <div className={`p-3 rounded-xl text-xs border ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>{msg.text}</div>}
        {rows.length === 0 && <p className="text-xs text-slate-500">Aún no hay asesores.</p>}
        <div className="grid gap-2">
          {rows.map(r => (
            <div key={r.advisorId} className="border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-[180px]">
                <div className="font-bold text-sm text-slate-900">{r.name} <span className="text-[10px] font-mono text-slate-500">{r.sellerCode}</span></div>
                <div className="text-[11px] text-slate-500">{r.email || 'Sin correo'} · {r.rate}% · {r.cycle === 'mensual' ? 'Mensual' : 'Quincenal'}</div>
                <div className="text-[11px] text-slate-500">Próximo corte: {fmt(r.nextCutoff)}{r.daysToCutoff === 0 ? ' (hoy)' : ` (en ${r.daysToCutoff} d)`} · pago: {fmt(r.payDate)}</div>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>Esperando Dropi: <strong>{formatCOP(r.esperandoDropi)}</strong></div>
                <div>Ya pagado: <strong>{formatCOP(r.pagada)}</strong></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Por pagar</div>
                  <div className="font-black font-mono text-emerald-700">{formatCOP(r.porPagar)}</div>
                </div>
                <button disabled={r.porPagar <= 0} onClick={() => { setTarget(r); setMsg(null); }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
                  <Banknote className="w-3.5 h-3.5" /> Liquidar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
        <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-sm"><History className="w-4 h-4 text-violet-600" /> Historial de liquidaciones</h3>
        {history.length === 0 ? <p className="text-xs text-slate-500">Todavía no se ha liquidado nada.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-slate-500"><th className="py-1">N°</th><th>Asesor</th><th>Fecha</th><th>Ventas</th><th>Medio</th><th className="text-right">Total</th><th>Correo</th></tr></thead>
              <tbody>{history.map(h => (
                <tr key={h.id} className="border-t border-slate-100">
                  <td className="py-1.5 font-mono">{h.id}</td><td>{h.advisorName}</td><td>{fmt(h.paidAt)}</td><td>{h.count}</td>
                  <td>{h.method}{h.reference ? ` · ${h.reference}` : ''}</td><td className="text-right font-mono font-bold">{formatCOP(h.total)}</td>
                  <td>{h.emailed ? <span className="text-emerald-600">Enviado</span> : <span className="text-amber-600">No enviado</span>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>

      {target && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !busy && setTarget(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
            <h4 className="font-extrabold text-slate-900">Liquidar a {target.name}</h4>
            <p className="text-sm text-slate-600">Vas a registrar el pago de <strong>{formatCOP(target.porPagar)}</strong> ({target.porPagarCount} venta{target.porPagarCount === 1 ? '' : 's'}).</p>
            <label className="block text-xs font-bold text-slate-600">Medio de pago
              <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm font-normal">
                {['Transferencia', 'Nequi', 'Daviplata', 'Efectivo', 'Otro'].map(m => <option key={m}>{m}</option>)}
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-600">Referencia (opcional)
              <input value={reference} onChange={e => setReference(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm font-normal" />
            </label>
            <label className="block text-xs font-bold text-slate-600">Nota para el asesor (opcional)
              <input value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-2 py-2 text-sm font-normal" />
            </label>
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {target.email ? `Se enviará el estado de cuenta a ${target.email}.` : 'El asesor no tiene correo: no se enviará el detalle.'}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button disabled={busy} onClick={() => setTarget(null)} className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-100 cursor-pointer">Cancelar</button>
              <button disabled={busy} onClick={liquidate} className="px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white flex items-center gap-1 cursor-pointer">
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
