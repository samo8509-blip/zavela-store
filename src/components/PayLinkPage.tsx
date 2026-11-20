import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCOP } from '../utils/formatters.ts';
import { triggerEpaycoCheckout } from '../services/epaycoService.ts';

interface Info { paid: boolean; orderNumber: string; total?: number; customerName?: string; customerPhone?: string; customerEmail?: string; address?: string; items?: { title: string; quantity: number }[] }

export const PayLinkPage: React.FC<{ token: string }> = ({ token }) => {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/payments/pay-info?token=${encodeURIComponent(token)}`).then(r => r.json()).then(j => {
      if (j.success) setInfo(j); else setError(j.message || 'Este enlace no es válido o ya venció.');
    }).catch(() => setError('No se pudo cargar tu pedido. Revisa tu conexión.'));
  }, [token]);

  const pay = async () => {
    if (!info) return;
    setBusy(true); setError('');
    try {
      await triggerEpaycoCheckout({
        orderId: info.orderNumber, orderReference: info.orderNumber, totalAmount: info.total || 0,
        customerName: info.customerName || 'Cliente', customerAddress: info.address || '', customerPhone: info.customerPhone || '',
        customerEmail: info.customerEmail || undefined, description: `Compra en Zavela Store - Pedido #${info.orderNumber}`
      });
    } catch (e: any) { setError(e.message || 'No se pudo abrir la pasarela de pago.'); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="text-lg font-black">Zavela Store</div>
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Pago seguro con ePayco</div>
        </div>
        {!info && !error && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>}
        {error && <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-300 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
        {info?.paid && <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-sm flex gap-2"><CheckCircle2 className="w-5 h-5 shrink-0" /> Tu pedido {info.orderNumber} ya está pagado. ¡Gracias por tu compra!</div>}
        {info && !info.paid && (
          <>
            <div className="text-sm text-slate-300">Hola {String(info.customerName || '').split(' ')[0]}, este es tu pedido <strong className="text-white">{info.orderNumber}</strong>:</div>
            <ul className="text-sm space-y-1 border-y border-slate-800 py-3">
              {(info.items || []).map((it, i) => <li key={i} className="flex justify-between gap-3"><span className="truncate">{it.title}</span><span className="text-slate-400">x{it.quantity}</span></li>)}
            </ul>
            <div className="flex justify-between text-base font-black"><span>Total a pagar</span><span className="text-emerald-300 font-mono">{formatCOP(info.total || 0)}</span></div>
            <button onClick={pay} disabled={busy} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-black text-sm uppercase tracking-wide disabled:opacity-50 cursor-pointer">
              {busy ? 'Abriendo pasarela…' : 'Pagar con PSE o tarjeta'}
            </button>
            <p className="text-[11px] text-slate-500 text-center">En la pasarela eliges PSE (tu banco), tarjeta u otros medios disponibles.</p>
          </>
        )}
      </div>
    </div>
  );
};
