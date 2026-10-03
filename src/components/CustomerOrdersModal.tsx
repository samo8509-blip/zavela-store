import React, { useState } from 'react';
import { 
  X, 
  Package, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Star, 
  RotateCcw, 
  ExternalLink, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CreditCard
} from 'lucide-react';
import { CustomerOrderHistory, getCustomerOrders } from '../utils/customerOrdersManager.ts';
import { formatCOP } from '../utils/formatters.ts';
import { addCustomerReview } from '../utils/reviewsManager.ts';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: (orderNumberOrGuide: string) => void;
  onReorder: (items: CustomerOrderHistory['items']) => void;
  showToast?: (msg: string) => void;
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  onTrackOrder,
  onReorder,
  showToast
}) => {
  const [orders, setOrders] = useState<CustomerOrderHistory[]>(() => getCustomerOrders());
  const [reviewingItem, setReviewingItem] = useState<{
    orderNumber: string;
    productTitle: string;
    productId: string;
  } | null>(null);

  // Review Form State
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Comprador Verificado');
  const [customerCity, setCustomerCity] = useState<string>('Bogotá D.C.');

  if (!isOpen) return null;

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItem || !comment.trim()) return;

    addCustomerReview({
      productName: reviewingItem.productTitle,
      productId: reviewingItem.productId,
      customerName: customerName.trim() || 'Cliente Verificado',
      customerCity: customerCity.trim() || 'Colombia',
      customerDepartment: 'Colombia',
      rating,
      comment: comment.trim(),
      verified: true,
      satisfactionBadges: ['Comprador Verificado', 'Pago Contra Entrega']
    });

    if (showToast) {
      showToast('⭐ ¡Muchas gracias por tu calificación! Tu reseña ha sido registrada exitosamente.');
    }

    setReviewingItem(null);
    setComment('');
    setRating(5);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#0A1128] to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block">
                Portal del Cliente • Zavela Store
              </span>
              <h2 className="text-base sm:text-lg font-black text-white">
                Mis Pedidos & Historial de Compras
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Guarantee Banner */}
        <div className="bg-emerald-50 px-6 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Todos tus pedidos cuentan con <strong>Garantía de Entrega y Pago Contra Entrega</strong> en efectivo.</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 hidden sm:inline font-bold">
            {orders.length} pedidos registrados
          </span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Aún no tienes pedidos registrados</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tus compras con Pago Contra Entrega aparecerán aquí para que puedas rastrearlas y calificarlas.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div 
                key={order.id}
                className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-slate-300 transition-all shadow-2xs"
              >
                {/* Order Top Line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900 font-mono">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs text-slate-500">• {order.date}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      order.status === 'entregado'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : order.status === 'enviado'
                        ? 'bg-sky-100 text-sky-800 border-sky-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {order.statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                    <span>Guía: {order.trackingNumber} ({order.carrier})</span>
                  </div>
                </div>

                {/* Purchased Products List */}
                <div className="space-y-2.5">
                  {order.items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={item.image} 
                          alt={item.title}
                          className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.title}
                          </h4>
                          <span className="text-xs text-slate-500 font-mono">
                            {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'} • {formatCOP(item.price)} c/u
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={() => setReviewingItem({
                            orderNumber: order.orderNumber,
                            productTitle: item.title,
                            productId: item.productId
                          })}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Dejar opinión sobre este producto"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>Dejar Reseña</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer & Actions */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-600">
                    <span>Método: <strong>{order.paymentMethod}</strong> • Destino: <strong>{order.customerCity}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black font-mono text-slate-900 mr-2">
                      Total: {formatCOP(order.total)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onTrackOrder(order.trackingNumber || order.orderNumber);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Rastrear Envío</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onReorder(order.items);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                      <span>Volver a pedir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Review Submission Dialog Inside Portal */}
          {reviewingItem && (
            <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-fadeIn">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                    <h3 className="text-sm font-bold text-slate-900">Dejar Reseña del Producto</h3>
                  </div>
                  <button 
                    onClick={() => setReviewingItem(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500 block">Producto adquirido:</span>
                  <strong className="text-slate-900">{reviewingItem.productTitle}</strong>
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Calificación (1 a 5 estrellas):
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star className={`w-6 h-6 ${
                            star <= rating ? 'text-amber-500 fill-amber-400' : 'text-slate-200'
                          }`} />
                        </button>
                      ))}
                      <span className="text-xs font-mono font-bold text-amber-600 ml-2">
                        {rating} de 5 estrellas
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tu nombre:</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej: Laura Morales"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Ciudad:</label>
                    <input 
                      type="text" 
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      placeholder="Ej: Medellín, Bogotá, Cali..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tu experiencia y comentario:
                    </label>
                    <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Cuéntanos qué tal te pareció el producto, el tiempo de entrega y el pago contra entrega..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden min-h-[80px]"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                    >
                      Publicar Reseña Verificada
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewingItem(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>¿Tienes dudas sobre una entrega? Contáctanos directamente por WhatsApp.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold uppercase text-[11px] tracking-wider transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
