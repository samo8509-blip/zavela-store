import React, { useEffect, useState } from 'react';
import { Wallet, Link2, Copy, CalendarClock } from 'lucide-react';
import { formatCOP } from '../../utils/formatters.ts';

interface Statement {
  cycle: 'quincenal' | 'mensual'; periodFrom: string; periodTo: string; nextCutoff: string; payDate: string; daysToCutoff: number;
  porPagar: number; esperandoDropi: number; enProceso: number; pagada: number; refLink: string;
  settlements: { id: string; total: number; count: number; paidAt: string; method: string; periodFrom: string; periodTo: string }[];
}
const fmt = (iso: string) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return y ? `${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]} ${y}` : '—';
};

export const AdvisorStatement: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const [s, setS] = useState<Statement | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = sessionStorage.getItem('zavela_advisor_token') || localStorage.getItem('zavela_advisor_token') || '';
        const r = await fetch('/api/admin/advisors/me/statement', { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (j.success) setS(j.data);
      } catch {}
    })();
  }, [refreshKey]);

  if (!s) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(s.refLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div className="bg-[#120829] border border-[#2D1854] rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-black text-white"><Wallet className="w-4 h-4 text-emerald-400" /> Mi estado de cuenta</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3">
          <div className="text-[10px] uppercase font-bold text-emerald-300">Por pagar</div>
          <div className="text-lg font-black font-mono text-emerald-300">{formatCOP(s.porPagar)}</div>
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3">
          <div className="text-[10px] uppercase font-bold text-amber-300">Esperando a Dropi</div>
          <div className="text-lg font-black font-mono text-amber-300">{formatCOP(s.esperandoDropi)}</div>
        </div>
        <div className="rounded-2xl bg-slate-500/10 border border-slate-500/30 p-3">
          <div className="text-[10px] uppercase font-bold text-slate-300">En proceso</div>
          <div className="text-lg font-black font-mono text-slate-200">{formatCOP(s.enProceso)}</div>
        </div>
        <div className="rounded-2xl bg-violet-500/10 border border-violet-500/30 p-3">
          <div className="text-[10px] uppercase font-bold text-violet-300">Ya pagado</div>
          <div className="text-lg font-black font-mono text-violet-300">{formatCOP(s.pagada)}</div>
        </div>
      </div>
      <div className="flex items-start gap-2 text-xs text-violet-200/90">
        <CalendarClock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          Te liquidamos {s.cycle === 'mensual' ? 'cada mes' : 'cada 15 días'}. Próximo corte: <strong className="text-white">{fmt(s.nextCutoff)}</strong>
          {s.daysToCutoff === 0 ? ' (hoy)' : ` (en ${s.daysToCutoff} día${s.daysToCutoff === 1 ? '' : 's'})`}; fecha estimada de pago: <strong className="text-white">{fmt(s.payDate)}</strong>.
          Solo entran al pago las ventas entregadas cuyo dinero ya pagó Dropi.
        </span>
      </div>
      <div className="rounded-2xl bg-[#0D051E] border border-[#2E1857] p-3 space-y-1.5">
        <div className="text-[11px] font-bold text-cyan-300 flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> Tu enlace personal de ventas</div>
        <div className="flex items-center gap-2">
          <input readOnly value={s.refLink} onFocus={e => e.currentTarget.select()} className="flex-1 bg-transparent border border-[#2E1857] rounded-lg px-2 py-1.5 text-xs text-white font-mono" />
          <button onClick={copy} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 text-xs font-bold flex items-center gap-1 cursor-pointer"><Copy className="w-3 h-3" />{copied ? 'Copiado' : 'Copiar'}</button>
        </div>
        <p className="text-[11px] text-violet-300/70">Si un cliente compra entrando por este enlace (dentro de 30 días), la venta queda a tu nombre.</p>
      </div>
      {s.settlements.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-bold text-violet-200">Pagos recibidos</div>
          {s.settlements.slice(0, 8).map(h => (
            <div key={h.id} className="flex justify-between text-xs text-violet-200/90 border-t border-[#2E1857] pt-1">
              <span>{fmt(h.paidAt)} · {h.id} · {h.count} venta{h.count === 1 ? '' : 's'} · {h.method}</span>
              <strong className="font-mono text-violet-200">{formatCOP(h.total)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
