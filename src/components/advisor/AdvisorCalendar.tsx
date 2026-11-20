import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { AdvisorSale } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

// Día de la venta en hora de Colombia (UTC-5) como YYYY-MM-DD
const dayOf = (iso: string) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  return new Date(t - 5 * 3600 * 1000).toISOString().slice(0, 10);
};
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const STATUS: Record<string, string> = {
  pendiente_bolsa: 'Pendiente', montado_dropi: 'Despacho confirmado', guia_generada: 'Guía generada',
  enviado: 'En ruta', entregado: 'Entregado', cancelado: 'Cancelado'
};

export const AdvisorCalendar: React.FC<{ sales: AdvisorSale[] }> = ({ sales }) => {
  const todayKey = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  const [year, setYear] = useState(Number(todayKey.slice(0, 4)));
  const [month, setMonth] = useState(Number(todayKey.slice(5, 7)) - 1);
  const [selected, setSelected] = useState(todayKey);

  const byDay = useMemo(() => {
    const m = new Map<string, AdvisorSale[]>();
    for (const s of sales) {
      if (s.dropiStatus === 'cancelado') continue;
      const k = dayOf(s.createdAt);
      if (k) m.set(k, [...(m.get(k) || []), s]);
    }
    return m;
  }, [sales]);

  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // semana empieza en lunes
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const key = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const go = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear()); setMonth(d.getUTCMonth());
  };

  const monthSales = [...byDay.entries()].filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).flatMap(([, v]) => v);
  const monthTotal = monthSales.reduce((n, s) => n + (s.totalAmount || 0), 0);
  const daySales = byDay.get(selected) || [];

  return (
    <div className="bg-[#13092A] border border-[#2D1854] rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="w-4 h-4 text-cyan-400" /> Calendario de mis ventas</div>
        <div className="flex items-center gap-2">
          <button onClick={() => go(-1)} className="w-8 h-8 rounded-lg bg-[#0C061C] border border-[#2D1854] text-white flex items-center justify-center cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-xs font-bold text-white w-32 text-center">{MONTHS[month]} {year}</div>
          <button onClick={() => go(1)} className="w-8 h-8 rounded-lg bg-[#0C061C] border border-[#2D1854] text-white flex items-center justify-center cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="text-[11px] text-violet-300">Este mes: <strong className="text-white">{monthSales.length}</strong> venta{monthSales.length === 1 ? '' : 's'} · <strong className="text-emerald-300 font-mono">{formatCOP(monthTotal)}</strong></div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map(d => <div key={d} className="text-[10px] font-bold text-violet-400 uppercase py-1">{d}</div>)}
        {cells.map((d, i) => {
          if (d == null) return <div key={`e${i}`} />;
          const k = key(d); const list = byDay.get(k) || []; const isSel = k === selected; const isToday = k === todayKey;
          return (
            <button key={k} onClick={() => setSelected(k)}
              className={`aspect-square sm:aspect-auto sm:h-14 rounded-lg border text-xs flex flex-col items-center justify-center cursor-pointer transition-all ${
                isSel ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-black' : list.length ? 'bg-emerald-500/15 border-emerald-500/40 text-white' : 'bg-[#0C061C] border-[#2D1854] text-violet-300 hover:border-cyan-400/50'
              } ${isToday && !isSel ? 'ring-1 ring-cyan-400' : ''}`}>
              <span>{d}</span>
              {list.length > 0 && <span className={`text-[9px] font-mono ${isSel ? 'text-slate-900' : 'text-emerald-300'}`}>{list.length} venta{list.length === 1 ? '' : 's'}</span>}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-white">
          {selected.split('-').reverse().join('/')} — {daySales.length ? `${daySales.length} venta${daySales.length === 1 ? '' : 's'} · ${formatCOP(daySales.reduce((n, s) => n + (s.totalAmount || 0), 0))}` : 'sin ventas este día'}
        </div>
        {daySales.map(s => (
          <div key={s.id} className="rounded-xl bg-[#0C061C] border border-[#2D1854] p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="font-bold text-white">{s.orderNumber} · {s.clientName}</div>
              <div className="text-violet-300 truncate max-w-[320px]">{s.productTitle}</div>
              {s.trackingNumber && <div className="text-[10px] text-cyan-300">Guía{s.carrier ? ` ${s.carrier}` : ''}: <span className="font-mono">{s.trackingNumber}</span>{s.carrierTrackingUrl && <> · <a href={s.carrierTrackingUrl} target="_blank" rel="noreferrer" className="underline">Rastrear</a></>}</div>}
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-emerald-300">{formatCOP(s.totalAmount)}</div>
              <div className="text-[10px] text-violet-300">{STATUS[s.dropiStatus] || s.dropiStatus}{s.paymentMethod === 'pse' ? ' · PSE' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
