import React, { useEffect } from 'react';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Share2, 
  ArrowRight, 
  X,
  PhoneCall,
  ShieldCheck,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order } from '../types/index.ts';
import { formatCOP, formatDate, ORDER_STATUS_MAP } from '../utils/formatters.ts';

interface OrderSuccessModalProps {
  order: Order | null;
  whatsappNumber?: string;
  onClose: () => void;
  onTrackOrder: (orderNumber: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  whatsappNumber,
  onClose,
  onTrackOrder
}) => {
  useEffect(() => {
    if (order) {
      // Fire celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [order]);

  if (!order) return null;

  const rawPhone = whatsappNumber || '573157894512';
  let cleanPhone = rawPhone.replace(/[^\d]/g, '');
  if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
    cleanPhone = `57${cleanPhone}`;
  }
  if (!cleanPhone) cleanPhone = '573157894512';

  const statusConfig = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pendiente;

  const whatsappMessage = encodeURIComponent(
    `¡Hola! Acabo de realizar el pedido *${order.orderNumber}* en ZAVELA STORE Colombia por valor de *${formatCOP(order.total)}* a nombre de *${order.customerName}* en *${order.city}, ${order.department}*. Quedo atento a la guía de despacho. ¡Gracias!`
  );

  return (
    <div 
      id="order-success-modal-backdrop" 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        id="order-success-modal-dialog" 
        className="bg-white text-slate-900 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col relative border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with celebratory icon */}
        <div className="bg-slate-50 text-slate-900 p-6 text-center relative border-b border-slate-200">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle className="w-9 h-9 text-emerald-600" />
          </div>

          <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
            ¡Compra Exitosa en ZAVELA STORE!
          </span>
          <h2 className="text-2xl font-black mt-1 text-slate-900">Pedido Confirmado</h2>
          <p className="text-xs text-slate-600 mt-1">
            Número de Pedido: <strong className="font-mono text-sky-800 text-sm bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-2xs">{order.orderNumber}</strong>
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-white">
          
          {/* Status Banner */}
          <div className="p-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Building2 className="w-4 h-4 text-sky-600" />
                Estado del Pedido:
              </span>
              <span className="px-2.5 py-0.5 rounded-md font-black text-[11px] text-sky-700 bg-white border border-sky-200 shadow-2xs">
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {statusConfig.description}
            </p>
          </div>

          {/* Delivery & Payment Details */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Destinatario:</span>
              <span className="font-bold text-slate-900">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Teléfono:</span>
              <span className="font-bold text-slate-900">+57 {order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Ciudad y Depto:</span>
              <span className="font-bold text-slate-900">{order.city}, {order.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Dirección:</span>
              <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">{order.address}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-600">Método de Pago:</span>
              <span className="font-black text-sky-700 uppercase">
                {order.paymentMethod === 'contra_entrega' ? 'Pago Contra Entrega' : 'Pago en Línea'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
              <span>Total a Pagar al Recibir:</span>
              <span className="text-slate-900 font-mono">{formatCOP(order.total)}</span>
            </div>
          </div>

          {/* Items Preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Productos en Despacho ({order.items.length}):
            </span>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <img 
                  src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'} 
                  alt="" 
                  className="w-10 h-10 object-cover rounded-lg shrink-0 border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-slate-900">{item.title}</div>
                  <div className="text-sky-700 text-[11px] font-mono font-medium">
                    {item.quantity} x {formatCOP(item.unitPrice)} {item.variantName && `• ${item.variantName}`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              id="btn-track-now-from-success"
              onClick={() => {
                onTrackOrder(order.orderNumber);
                onClose();
              }}
              className="w-full bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#E04826] hover:to-[#E02656] text-white font-black py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider"
            >
              <Truck className="w-4 h-4 text-white" />
              <span>Ver Seguimiento en Tiempo Real</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              id="btn-whatsapp-confirm"
              href={`https://wa.me/${cleanPhone}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
            >
              <PhoneCall className="w-4 h-4 text-emerald-700" />
              <span>Confirmar por WhatsApp con Asesor Zavela</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};
