import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Target, Users, MessageCircle, Copy, Check, Bell } from 'lucide-react';
import { AdvisorSale } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

const token = () => sessionStorage.getItem('zavela_advisor_token') || localStorage.getItem('zavela_advisor_token') || '';
const waLink = (phone: string, text: string) => {
  const p = String(phone || '').replace(/\D/g, '');
  return `https://wa.me/${p.startsWith('57') ? p : '57' + p}?text=${encodeURIComponent(text)}`;
};
const card = 'bg-[#13092A] border border-[#2D1854] rounded-2xl p-4';

// ---------------- Metas y ranking ----------------
interface Rank { month: string; goal: number; monthTotal: number; monthCount: number; position: number; advisors: number; leaderboard: { position: number; name: string; count: number; isMe: boolean }[] }

export const AdvisorGoals: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const [r, setR] = useState<Rank | null>(null);
  useEffect(() => {
    fetch('/api/admin/advisors/me/ranking', { headers: { Authorization: `Bearer ${token()}` } })
      .then(x => x.json()).then(j => { if (j.success) setR(j.data); }).catch(() => {});
  }, [refreshKey]);
  if (!r) return <div className={card + ' text-xs text-violet-300'}>Cargando tu avance…</div>;
  const pct = r.goal > 0 ? Math.min(100, Math.round((r.monthTotal / r.goal) * 100)) : 0;
  return (
    <div className="space-y-4">
      <div className={card + ' space-y-3'}>
        <div className="flex items-center gap-2 text-sm font-black text-white"><Target className="w-4 h-4 text-emerald-400" /> Mi meta del mes</div>
        {r.goal > 0 ? (
          <>
            <div className="flex justify-between text-xs text-violet-200"><span>Vendido: <strong className="text-white font-mono">{formatCOP(r.monthTotal)}</strong></span><span>Meta: <strong className="text-white font-mono">{formatCOP(r.goal)}</strong></span></div>
            <div className="h-3 rounded-full bg-[#0C061C] border border-[#2D1854] overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${pct}%` }} /></div>
            <div className="text-xs text-violet-300">{pct >= 100 ? '¡Meta cumplida! 🎉' : `Llevas el ${pct}%. Te faltan ${formatCOP(r.goal - r.monthTotal)}.`}</div>
          </>
        ) : (
          <div className="text-xs text-violet-300">Aún no tienes una meta asignada. Este mes llevas <strong className="text-white">{r.monthCount}</strong> venta(s) por <strong className="text-emerald-300 font-mono">{formatCOP(r.monthTotal)}</strong>. Pídele una meta al administrador.</div>
        )}
      </div>
      <div className={card + ' space-y-2'}>
        <div className="flex items-center gap-2 text-sm font-black text-white"><Trophy className="w-4 h-4 text-amber-300" /> Ranking del mes</div>
        <div className="text-xs text-violet-300">Estás en el puesto <strong className="text-white">{r.position}</strong> de {r.advisors}. Se ordena por ventas del mes.</div>
        {r.leaderboard.map(b => (
          <div key={b.position} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs border ${b.isMe ? 'bg-cyan-500/15 border-cyan-400/50 text-white' : 'bg-[#0C061C] border-[#2D1854] text-violet-200'}`}>
            <span><strong className="font-mono mr-2">#{b.position}</strong>{b.isMe ? 'Tú' : b.name}</span>
            <span>{b.count} venta{b.count === 1 ? '' : 's'}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------- Plantillas de WhatsApp ----------------
const TEMPLATES = (name: string) => [
  { title: 'Saludo', text: `Hola ${name}, te saluda un asesor de Zavela Store 👋. ¿En qué producto estás interesado? Con gusto te ayudo.` },
  { title: 'Cierre de venta', text: `${name}, ¡excelente elección! Para despachar tu pedido necesito: nombre completo, celular, ciudad, departamento y dirección. El pago es contra entrega o por PSE, como prefieras.` },
  { title: 'Datos confirmados', text: `Listo ${name}, tu pedido quedó registrado ✅. En cuanto lo autoricemos te enviamos la guía de seguimiento.` },
  { title: 'Pedido en camino', text: `Hola ${name}, tu pedido ya va en camino 🚚. Recuerda tener el valor listo si es contra entrega. ¡Gracias por tu compra!` },
  { title: 'Seguimiento', text: `Hola ${name}, ¿cómo te fue con tu pedido? Si necesitas algo más, estoy a tu disposición 😊.` },
  { title: 'Sin respuesta', text: `Hola ${name}, ¿pudiste ver la información? Si te interesa, aún tengo unidades disponibles. Quedo atento.` }
];

export const AdvisorTemplates: React.FC<{ clients: { name: string; phone: string }[] }> = ({ clients }) => {
  const [who, setWho] = useState('');
  const [copied, setCopied] = useState('');
  const c = clients.find(x => x.phone === who);
  const name = (c?.name || 'cliente').split(' ')[0];
  const copy = async (t: string, id: string) => { try { await navigator.clipboard.writeText(t); setCopied(id); setTimeout(() => setCopied(''), 1500); } catch {} };
  return (
    <div className="space-y-3">
      <div className={card + ' space-y-2'}>
        <div className="text-xs font-bold text-violet-200">Elige un cliente (opcional) para personalizar los mensajes</div>
        <select value={who} onChange={e => setWho(e.target.value)} className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white">
          <option value="">Sin cliente (usa “cliente”)</option>
          {clients.map(x => <option key={x.phone} value={x.phone}>{x.name} · {x.phone}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {TEMPLATES(name).map(t => (
          <div key={t.title} className={card + ' space-y-2'}>
            <div className="text-xs font-black text-cyan-300">{t.title}</div>
            <p className="text-xs text-violet-100 leading-relaxed">{t.text}</p>
            <div className="flex gap-2">
              <button onClick={() => copy(t.text, t.title)} className="px-3 py-1.5 rounded-lg bg-[#0C061C] border border-[#2D1854] text-xs text-white flex items-center gap-1 cursor-pointer">{copied === t.title ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied === t.title ? 'Copiado' : 'Copiar'}</button>
              {c && <a href={waLink(c.phone, t.text)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs text-white font-bold flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Enviar</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------- Mis clientes ----------------
export interface ClientRow { name: string; phone: string; city: string; count: number; total: number; last: string }
export const clientsFrom = (sales: AdvisorSale[]): ClientRow[] => {
  const m = new Map<string, ClientRow>();
  for (const s of sales) {
    if (s.dropiStatus === 'cancelado' || !s.clientPhone) continue;
    const k = s.clientPhone.replace(/\D/g, '');
    const cur = m.get(k) || { name: s.clientName, phone: k, city: s.clientCity, count: 0, total: 0, last: s.createdAt };
    cur.count += 1; cur.total += Number(s.totalAmount || 0);
    if (new Date(s.createdAt) > new Date(cur.last)) { cur.last = s.createdAt; cur.name = s.clientName; cur.city = s.clientCity; }
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => new Date(b.last).getTime() - new Date(a.last).getTime());
};

export const AdvisorClients: React.FC<{ sales: AdvisorSale[] }> = ({ sales }) => {
  const [q, setQ] = useState('');
  const rows = useMemo(() => clientsFrom(sales).filter(c => !q.trim() || `${c.name} ${c.phone} ${c.city}`.toLowerCase().includes(q.toLowerCase())), [sales, q]);
  return (
    <div className="space-y-3">
      <div className={card}>
        <div className="flex items-center gap-2 text-sm font-black text-white mb-2"><Users className="w-4 h-4 text-cyan-400" /> Mis clientes ({clientsFrom(sales).length})</div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, celular o ciudad…" className="w-full bg-[#0C061C] border border-[#2D1854] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400" />
      </div>
      {rows.length === 0 && <div className={card + ' text-xs text-violet-300'}>Todavía no tienes clientes. Aparecen aquí cuando registras ventas.</div>}
      {rows.map(c => (
        <div key={c.phone} className={card + ' flex flex-wrap items-center justify-between gap-3'}>
          <div>
            <div className="text-sm font-bold text-white">{c.name}</div>
            <div className="text-[11px] text-violet-300">{c.phone} · {c.city}</div>
            <div className="text-[11px] text-violet-300">{c.count} compra{c.count === 1 ? '' : 's'} · {formatCOP(c.total)} · última: {String(c.last).slice(0, 10)}</div>
          </div>
          <a href={waLink(c.phone, `Hola ${c.name.split(' ')[0]}, te saluda de nuevo tu asesor de Zavela Store 👋. ¿Cómo te fue con tu pedido? Tengo novedades que te pueden interesar.`)} target="_blank" rel="noreferrer"
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Escribir por WhatsApp</a>
        </div>
      ))}
    </div>
  );
};

// ---------------- Avisos (campana) ----------------
interface Notice { id: string; at: string; text: string }
export const AdvisorBell: React.FC<{ advisorId: string; sales: AdvisorSale[] }> = ({ advisorId, sales }) => {
  const [open, setOpen] = useState(false);
  const [paid, setPaid] = useState<{ id: string; total: number; paidAt: string }[]>([]);
  const key = `zavela_adv_seen_${advisorId}`;
  const [seen, setSeen] = useState<number>(() => { try { return Number(localStorage.getItem(key) || 0); } catch { return 0; } });

  useEffect(() => {
    fetch('/api/admin/advisors/me/statement', { headers: { Authorization: `Bearer ${token()}` } })
      .then(x => x.json()).then(j => { if (j.success) setPaid(j.data.settlements || []); }).catch(() => {});
  }, [sales.length]);

  const notices: Notice[] = useMemo(() => {
    const out: Notice[] = [];
    for (const s of sales) {
      const at = s.updatedAt || s.createdAt;
      const base = `${s.orderNumber} (${s.clientName})`;
      if (s.dropiStatus === 'montado_dropi' || s.dropiStatus === 'guia_generada') out.push({ id: `${s.id}-a`, at, text: `Tu venta ${base} fue autorizada.` });
      if (s.dropiStatus === 'enviado') out.push({ id: `${s.id}-e`, at, text: `Tu venta ${base} va en ruta${s.trackingNumber ? ` (guía ${s.trackingNumber})` : ''}.` });
      if (s.dropiStatus === 'entregado') out.push({ id: `${s.id}-d`, at, text: `Tu venta ${base} fue entregada.` });
      if (s.dropiStatus === 'cancelado') out.push({ id: `${s.id}-c`, at, text: `Tu venta ${base} fue cancelada.` });
      if (s.commissionStatus === 'por_pagar') out.push({ id: `${s.id}-p`, at: s.dropiPaidAt || at, text: `Tu comisión de ${base} ya está lista para pago (${formatCOP(Number(s.commissionAmount || 0))}).` });
    }
    for (const p of paid) out.push({ id: p.id, at: p.paidAt, text: `Te pagaron la liquidación ${p.id} por ${formatCOP(p.total)}.` });
    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 20);
  }, [sales, paid]);

  const unread = notices.filter(n => new Date(n.at).getTime() > seen).length;
  const toggle = () => {
    const next = !open; setOpen(next);
    if (!next) { const now = Date.now(); setSeen(now); try { localStorage.setItem(key, String(now)); } catch {} }
  };
  return (
    <div className="relative">
      <button onClick={toggle} className="relative w-10 h-10 rounded-xl bg-[#140B2E] border border-[#2C1752] text-violet-200 hover:text-white flex items-center justify-center cursor-pointer" title="Avisos">
        <Bell className="w-4 h-4" />
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto z-40 rounded-2xl bg-[#13092A] border border-[#2D1854] shadow-2xl p-2 space-y-1">
          {notices.length === 0 && <div className="p-3 text-xs text-violet-300">No hay avisos todavía.</div>}
          {notices.map(n => (
            <div key={n.id} className={`p-2.5 rounded-xl text-xs border ${new Date(n.at).getTime() > seen ? 'bg-cyan-500/10 border-cyan-500/30 text-white' : 'bg-[#0C061C] border-[#2D1854] text-violet-200'}`}>
              {n.text}<div className="text-[10px] text-violet-400 mt-0.5">{String(n.at).slice(0, 10)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
