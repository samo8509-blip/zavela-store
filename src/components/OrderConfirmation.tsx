import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowLeft, 
  Package, 
  ShieldCheck, 
  PhoneCall, 
  Copy, 
  Check, 
  Loader2, 
  ShoppingBag,
  ExternalLink,
  Truck,
  CreditCard
} from 'lucide-react';
import { Order } from '../types/index.ts';
import { formatCOP } from '../utils/formatters.ts';

interface OrderConfirmationProps {
  onBackToStore: () => void;
  onTrackOrder?: (orderQuery: string) => void;
}

interface PaymentVerifyResponse {
  success: boolean;
  ref_pay: string;
  status: string;
  cod_response: number | null;
  epayco?: {
    x_ref_pay?: string | number;
    x_transaction_id?: string;
    x_id_invoice?: string;
    x_description?: string;
    x_amount?: string | number;
    x_currency_code?: string;
    x_bank_name?: string;
    x_response?: string;
    x_response_reason_text?: string;
    x_transaction_date?: string;
    x_franchise?: string;
  };
  order?: Order | null;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  onBackToStore,
  onTrackOrder
}) => {
  const [refPay, setRefPay] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [verificationData, setVerificationData] = useState<PaymentVerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref_pay') || params.get('x_ref_pay') || '';
      setRefPay(ref);

      if (!ref) {
        setLoading(false);
        setErrorMessage('No se encontró el parámetro de referencia de pago (ref_pay) en la URL.');
        return;
      }

      // Consultar endpoint backend para verificar transacción con ePayco
      const fetchVerification = async () => {
        try {
          const res = await fetch(`/api/payments/verify/${encodeURIComponent(ref)}`);
          if (!res.ok) {
            throw new Error(`Error en la consulta del servidor (HTTP ${res.status})`);
          }
          const data: PaymentVerifyResponse = await res.json();
          setVerificationData(data);
        } catch (err: any) {
          console.warn('[OrderConfirmation Verify Warning]:', err);
          // Fallback directo a la API de ePayco si el backend no pudo ser contactado
          try {
            const directRes = await fetch(`https://secure.epayco.co/validation/v1/reference/${encodeURIComponent(ref)}`);
            if (directRes.ok) {
              const epaycoDirect = await directRes.json();
              if (epaycoDirect && epaycoDirect.data) {
                setVerificationData({
                  success: true,
                  ref_pay: ref,
                  status: epaycoDirect.data.x_response || 'Procesada',
                  cod_response: Number(epaycoDirect.data.x_cod_response),
                  epayco: epaycoDirect.data,
                  order: null
                });
                return;
              }
            }
          } catch {}
          setErrorMessage(err.message || 'Error al validar la referencia de ePayco.');
        } finally {
          setLoading(false);
        }
      };

      fetchVerification();
    } catch (e: any) {
      setLoading(false);
      setErrorMessage(e.message || 'Error inesperado al cargar la confirmación.');
    }
  }, []);

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    }
  };

  const codResponse = verificationData?.cod_response;
  const epayco = verificationData?.epayco;
  const order = verificationData?.order;

  // Clasificación del estado según código oficial ePayco:
  // 1 = Aceptada / Aprobada
  // 2 = Rechazada
  // 3 = Pendiente
  // 4 = Fallida / Cancelada
  const isApproved = codResponse === 1 || verificationData?.status?.toLowerCase().includes('aceptad') || verificationData?.status?.toLowerCase().includes('aprobad');
  const isPending = codResponse === 3 || verificationData?.status?.toLowerCase().includes('pendient');
  const isRejected = codResponse === 2 || codResponse === 4 || verificationData?.status?.toLowerCase().includes('rechaz') || verificationData?.status?.toLowerCase().includes('fall');

  const orderNumber = order?.orderNumber || epayco?.x_id_invoice || 'ZAVELA-ONLINE';
  const amountPaid = epayco?.x_amount ? Number(epayco.x_amount) : (order?.total || 0);

  const whatsappSupportUrl = `https://wa.me/573008784427?text=${encodeURIComponent(
    `Hola Zavela Store, acabo de realizar un pago por ePayco con referencia #${refPay || ''} para el pedido #${orderNumber}. ¿Podrían confirmar mi despacho?`
  )}`;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-2xl w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
        
        {/* Brand header */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg">
              Z
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-amber-400 font-bold block">
                ZAVELA STORE COLOMBIA
              </span>
              <h1 className="text-lg sm:text-xl font-black text-white">
                Confirmación de Pago ePayco
              </h1>
            </div>
          </div>
          <span className="text-[10px] sm:text-xs font-mono font-bold bg-slate-700/60 text-slate-300 px-3 py-1 rounded-full border border-slate-600/50">
            🇨🇴 Pasarela Oficial
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-16 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Validando tu transacción con ePayco...</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Estamos consultando de forma segura con la red bancaria de ePayco Colombia para verificar tu comprobante de pago.
            </p>
          </div>
        )}

        {/* Error state without data */}
        {!loading && errorMessage && !verificationData && (
          <div className="py-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">No se pudo verificar la transacción</h2>
            <p className="text-sm text-slate-300 bg-slate-900/60 p-4 rounded-2xl border border-slate-700 text-left font-mono">
              {errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={onBackToStore}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 px-6 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver a la Tienda
              </button>
              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <PhoneCall className="w-4 h-4" />
                Contactar Asesor WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Result state with data */}
        {!loading && verificationData && (
          <div className="space-y-8">
            
            {/* 1. Status Banner */}
            {isApproved && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 font-mono bg-emerald-900/60 px-3 py-0.5 rounded-full border border-emerald-700/50">
                  ¡TRANSACCIÓN EXITOSA!
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  ¡Tu pago ha sido aprobado!
                </h2>
                <p className="text-sm text-emerald-200/90 max-w-md mx-auto">
                  Gracias por tu compra en ZavelaStore. Tu orden ha sido confirmada y nuestro equipo logístico ya está alistando tu paquete para despacho nacional.
                </p>
              </div>
            )}

            {isPending && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-3xl p-6 text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <Clock className="w-9 h-9" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 font-mono bg-amber-900/60 px-3 py-0.5 rounded-full border border-amber-700/50">
                  TRANSACCIÓN PENDIENTE
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Pago en proceso de validación
                </h2>
                <p className="text-sm text-amber-200/90 max-w-md mx-auto">
                  Tu entidad bancaria o PSE está procesando la transacción. Tan pronto como tu banco la apruebe, el pedido se confirmará automáticamente.
                </p>
              </div>
            )}

            {isRejected && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-3xl p-6 text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <XCircle className="w-9 h-9" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 font-mono bg-rose-900/60 px-3 py-0.5 rounded-full border border-rose-700/50">
                  PAGO NO COMPLETADO
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  Transacción rechazada o cancelada
                </h2>
                <p className="text-sm text-rose-200/90 max-w-md mx-auto">
                  {epayco?.x_response_reason_text || 'La pasarela no pudo procesar el cobro. Puedes intentar con otro medio de pago o seleccionar Pago Contra Entrega.'}
                </p>
              </div>
            )}

            {/* 2. Transaction Details Card */}
            <div className="bg-slate-900/70 border border-slate-700/70 rounded-2xl p-5 space-y-3.5 text-xs sm:text-sm">
              <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>Detalles de la Transacción</span>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block text-xs">Referencia ePayco:</span>
                  <div className="flex items-center gap-2 mt-0.5 font-mono font-bold text-amber-400">
                    <span>{refPay || epayco?.x_ref_pay || 'N/A'}</span>
                    {refPay && (
                      <button
                        onClick={() => handleCopy(refPay)}
                        className="text-slate-400 hover:text-white transition cursor-pointer p-1 rounded"
                        title="Copiar referencia"
                      >
                        {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-xs">Número de Pedido:</span>
                  <span className="font-mono font-bold text-white block mt-0.5">
                    #{orderNumber}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-xs">Monto Total:</span>
                  <span className="font-mono font-black text-base text-emerald-400 block mt-0.5">
                    {formatCOP(amountPaid)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-xs">Medio / Banco:</span>
                  <span className="font-semibold text-slate-200 block mt-0.5">
                    {epayco?.x_bank_name || epayco?.x_franchise || 'ePayco Colombia (PSE / Tarjeta)'}
                  </span>
                </div>

                {epayco?.x_transaction_date && (
                  <div>
                    <span className="text-slate-400 block text-xs">Fecha y Hora:</span>
                    <span className="text-slate-300 block mt-0.5">
                      {epayco.x_transaction_date}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block text-xs">Costo de Envío:</span>
                  <span className="font-bold text-emerald-400 block mt-0.5 text-xs">
                    $0 COP (Envío Gratis Nacional)
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-xs">Estado de Transacción:</span>
                  <span className={`font-black uppercase tracking-wider inline-block mt-0.5 ${
                    isApproved ? 'text-emerald-400' : isPending ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {verificationData.status || (isApproved ? 'APROBADA' : isPending ? 'PENDIENTE' : 'RECHAZADA')}
                  </span>
                </div>
              </div>

              {/* Order recipient details if order is available */}
              {order && (
                <div className="border-t border-slate-800 pt-3 mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Datos de Envío:</span>
                  </div>
                  <p className="text-slate-300">
                    <strong>Destinatario:</strong> {order.customerName} ({order.customerPhone})
                  </p>
                  <p className="text-slate-300">
                    <strong>Dirección:</strong> {order.address}, {order.city}, {order.department}
                  </p>
                  <p className="text-slate-300">
                    <strong>Flete de Despacho:</strong> <span className="text-emerald-400 font-bold">$0 COP (Envío Gratis Nacional)</span>
                  </p>
                  {order.items && order.items.length > 0 && (
                    <p className="text-slate-400 text-[11px] pt-1">
                      <strong>Artículos:</strong> {order.items.map(i => `${i.quantity}x ${i.title}`).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 3. Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onBackToStore}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 px-6 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Volver a la Tienda
                </button>

                {onTrackOrder && (
                  <button
                    onClick={() => onTrackOrder(orderNumber)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-6 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 border border-slate-600"
                  >
                    <Package className="w-5 h-5 text-sky-400" />
                    Rastrear Pedido
                  </button>
                )}
              </div>

              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 text-sm shadow"
              >
                <PhoneCall className="w-4 h-4 text-emerald-200" />
                Confirmar o consultar pedido con asesor por WhatsApp (+57 300 878 4427)
              </a>
            </div>

            {/* Trust badge footer */}
            <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Transacción 100% protegida y cifrada con ePayco Colombia y Zavela Store</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
