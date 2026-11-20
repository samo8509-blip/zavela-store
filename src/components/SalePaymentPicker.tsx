import React, { useState } from 'react';
import { Banknote, Landmark, Mail, MessageCircle, Copy, Check, X } from 'lucide-react';
import { formatCOP } from '../utils/formatters.ts';

export type SalePay = 'contra_entrega' | 'pse';

interface PickerProps {
  value: SalePay; onChange: (v: SalePay) => void;
  email: string; onEmail: (v: string) => void;
}

export const SalePaymentPicker: React.FC<PickerProps> = ({ value, onChange, email, onEmail }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-slate-300 block">Método de pago *</label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <button type="button" onClick={() => onChange('contra_entrega')}
        className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${value === 'contra_entrega' ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}>
        <div className="flex items-center gap-2 text-xs font-bold text-white"><Banknote className="w-4 h-4 text-emerald-400" /> Contra entrega</div>
        <div className="text-[11px] text-slate-400 mt-1">El cliente paga al recibir el pedido.</div>
      </button>
      <button type="button" onClick={() => onChange('pse')}
        className={`text-left rounded-xl border p-3 cursor-pointer transition-all ${value === 'pse' ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`}>
        <div className="flex items-center gap-2 text-xs font-bold text-white"><Landmark className="w-4 h-4 text-cyan-400" /> PSE (pago en línea)</div>
        <div className="text-[11px] text-slate-400 mt-1">Se le envía un enlace de pago al cliente.</div>
      </button>
    </div>
    {value === 'pse' && (
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-300">Correo del cliente (opcional, para enviarle el enlace)</label>
        <input type="email" value={email} onChange={e => onEmail(e.target.value)} placeholder="cliente@correo.com"
          className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none" />
        <p className="text-[11px] text-slate-400">Al registrar la venta podrás enviarle el enlace por WhatsApp a su número; si pones correo, también se le envía por correo. La venta pasa a despacho cuando el pago sea aprobado.</p>
      </div>
    )}
  </div>
);

export interface PayLinkInfo {
  link: string; orderNumber: string; total: number; clientName: string; clientPhone: string;
  emailSent?: boolean; emailNote?: string; email?: string;
}

export const PaymentLinkCard: React.FC<{ info: PayLinkInfo; onClose: () => void }> = ({ info, onClose }) => {
  const [copied, setCopied] = useState(false);
  const phone = info.clientPhone.replace(/\D/g, '');
  const wa = `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}?text=${encodeURIComponent(
    `Hola ${info.clientName.split(' ')[0]}, te saluda Zavela Store. Tu pedido ${info.orderNumber} por ${formatCOP(info.total)} está listo. Puedes pagarlo de forma segura con PSE (o tarjeta) en este enlace: ${info.link}`)}`;
  const copy = async () => { try { await navigator.clipboard.writeText(info.link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md space-y-3 text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-black">Venta {info.orderNumber} registrada</div>
            <div className="text-xs text-slate-400">Falta el pago PSE de {formatCOP(info.total)}. Envía el enlace al cliente.</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <input readOnly value={info.link} onFocus={e => e.currentTarget.select()} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-200" />
        <div className="grid grid-cols-2 gap-2">
          <a href={wa} target="_blank" rel="noreferrer" className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"><MessageCircle className="w-4 h-4" /> Enviar por WhatsApp</a>
          <button onClick={copy} className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado' : 'Copiar enlace'}</button>
        </div>
        <div className={`text-[11px] flex items-start gap-1.5 ${info.emailSent ? 'text-emerald-300' : 'text-amber-300'}`}>
          <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{info.emailSent ? 'Se envió el enlace al correo del cliente.' : `Correo no enviado: ${info.emailNote || 'sin detalle'}.`}</span>
        </div>
      </div>
    </div>
  );
};
