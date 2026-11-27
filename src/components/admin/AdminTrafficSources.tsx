import React from 'react';

/** "De dónde llegan": visitas por origen (anuncio de Facebook, Instagram, Google, directo...) en el período elegido. */
const NAMES: Record<string, string> = { directo: 'Directo (escribieron la dirección)', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', google: 'Google', whatsapp: 'WhatsApp' };
const MEDIUMS: Record<string, string> = { 'clic-sin-etiqueta': 'clic desde Facebook (sin etiqueta)', referido: 'enlace', paid: 'anuncio pagado', cpc: 'anuncio pagado', '-': '' };

export const AdminTrafficSources: React.FC<{ range: 'today' | '7d' | '30d' | 'all' }> = ({ range }) => {
  const [data, setData] = React.useState<{ available: boolean; total: number; rows: { source: string; medium: string; campaign: string; visits: number }[] } | null>(null);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    let off = false;
    setErr('');
    fetch(`/api/admin/metrics/sources?range=${range}`)
      .then(r => r.json())
      .then(j => { if (off) return; if (j?.success) setData({ available: Boolean(j.available), total: Number(j.total) || 0, rows: j.rows || [] }); else setErr(j?.message || 'No se pudo leer.'); })
      .catch(() => { if (!off) setErr('No se pudo leer el origen de las visitas.'); });
    return () => { off = true; };
  }, [range]);

  return (
    <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sky-400 text-xs font-bold uppercase tracking-wider">De dónde llegan las visitas</h4>
        {data?.available && <span className="text-[11px] text-slate-400">{data.total} visitas en el período</span>}
      </div>
      {err && <p className="text-xs text-rose-300">{err}</p>}
      {data && !data.available && <p className="text-xs text-slate-400">La tienda aún no tiene base de datos para guardar esto.</p>}
      {data?.available && data.rows.length === 0 && (
        <p className="text-xs text-slate-400">Todavía no hay visitas registradas con origen. Se empiezan a contar desde que se publicó esta función.</p>
      )}
      {data?.available && data.rows.length > 0 && (
        <div className="space-y-1.5">
          {data.rows.map((r, i) => {
            const pct = data.total ? Math.round((r.visits / data.total) * 100) : 0;
            const label = NAMES[r.source] || r.source;
            const extra = [MEDIUMS[r.medium] ?? r.medium, r.campaign !== '-' ? `campaña: ${r.campaign}` : ''].filter(Boolean).join(' · ');
            return (
              <div key={`${r.source}|${r.medium}|${r.campaign}|${i}`} className="text-xs">
                <div className="flex items-center justify-between gap-3 text-slate-200">
                  <span className="truncate">{label}{extra ? <span className="text-slate-500"> — {extra}</span> : null}</span>
                  <span className="font-mono shrink-0">{r.visits} · {pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1"><div className="h-full bg-sky-500" style={{ width: `${Math.max(2, pct)}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
