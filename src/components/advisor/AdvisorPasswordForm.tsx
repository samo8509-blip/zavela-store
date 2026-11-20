import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';

export const AdvisorPasswordForm: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (next.length < 6) return setMsg({ ok: false, text: 'La clave nueva debe tener al menos 6 caracteres.' });
    if (next !== again) return setMsg({ ok: false, text: 'La confirmación no coincide con la clave nueva.' });
    setBusy(true);
    try {
      const token = sessionStorage.getItem('zavela_advisor_token') || localStorage.getItem('zavela_advisor_token') || '';
      const r = await fetch('/api/admin/advisors/me/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next })
      });
      const j = await r.json().catch(() => ({}));
      if (j.success) { setMsg({ ok: true, text: 'Tu clave se cambió. Úsala la próxima vez que ingreses.' }); setCurrent(''); setNext(''); setAgain(''); }
      else setMsg({ ok: false, text: j.message || 'No se pudo cambiar la clave.' });
    } catch { setMsg({ ok: false, text: 'No se pudo conectar. Intenta de nuevo.' }); }
    setBusy(false);
  };

  const input = 'w-full bg-[#0C061C] border border-[#2D1854] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none';
  return (
    <form onSubmit={submit} className="bg-[#13092A] border border-[#2D1854] rounded-2xl p-4 space-y-3 max-w-md">
      <div className="flex items-center gap-2 text-sm font-black text-white"><KeyRound className="w-4 h-4 text-amber-300" /> Cambiar mi clave</div>
      {msg && <div className={`p-2.5 rounded-xl text-xs border ${msg.ok ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-rose-950/60 border-rose-700 text-rose-300'}`}>{msg.text}</div>}
      <input type="password" required value={current} onChange={e => setCurrent(e.target.value)} placeholder="Clave actual" autoComplete="current-password" className={input} />
      <input type="password" required value={next} onChange={e => setNext(e.target.value)} placeholder="Clave nueva (mínimo 6 caracteres)" autoComplete="new-password" className={input} />
      <input type="password" required value={again} onChange={e => setAgain(e.target.value)} placeholder="Repite la clave nueva" autoComplete="new-password" className={input} />
      <button disabled={busy} className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
        {busy && <Loader2 className="w-3 h-3 animate-spin" />} Guardar clave nueva
      </button>
    </form>
  );
};
