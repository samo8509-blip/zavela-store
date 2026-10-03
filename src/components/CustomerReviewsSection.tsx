import React, { useState } from 'react';
import { 
  Star, 
  CheckCircle2, 
  MapPin, 
  ThumbsUp, 
  ShieldCheck, 
  Truck, 
  Image as ImageIcon, 
  Camera, 
  Plus, 
  X,
  Award,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  ProductReview, 
  getVerifiedPositiveReviews, 
  addCustomerReview 
} from '../utils/reviewsManager.ts';

export const CustomerReviewsSection: React.FC = () => {
  const [reviews, setReviews] = useState<ProductReview[]>(() => getVerifiedPositiveReviews());
  const [activeFilter, setActiveFilter] = useState<'all' | 'with_photos' | '5_stars'>('all');
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);

  // Form State
  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [carrier, setCarrier] = useState('Servientrega');

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !comment.trim() || !productName.trim()) return;

    addCustomerReview({
      productName: productName.trim(),
      customerName: customerName.trim(),
      customerCity: customerCity.trim() || 'Colombia',
      customerDepartment: 'Colombia',
      rating,
      comment: comment.trim(),
      verified: true,
      carrier,
      satisfactionBadges: ['Comprador Verificado', 'Pago al Recibir']
    });

    setReviews(getVerifiedPositiveReviews());
    setIsAddReviewOpen(false);
    setProductName('');
    setCustomerName('');
    setComment('');
  };

  const filteredReviews = reviews.filter(r => {
    if (activeFilter === 'with_photos') return Boolean(r.customerPhotoUrl);
    if (activeFilter === '5_stars') return r.rating === 5;
    return true;
  });

  return (
    <section id="customer-reviews-section" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 my-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-sky-600" />
              Opiniones de Clientes Verificados en Colombia
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Experiencias reales con <strong>Pago Contra Entrega</strong> y fotos de paquetes recibidos en su puerta con transportadoras aliadas.
          </p>
        </div>

        {/* Aggregate Score Card & Add Review Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl">
            <div className="text-center">
              <span className="text-2xl font-black text-slate-900 font-mono block leading-none">4.9</span>
              <span className="text-[10px] text-slate-500 font-mono">de 5.0</span>
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-0.5">
                +1,850 Entregas Exitosas
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddReviewOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dejar Opinión</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Trust Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Todas las verificadas ({reviews.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('with_photos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === 'with_photos'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Con fotos de clientes ({reviews.filter(r => r.customerPhotoUrl).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('5_stars')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeFilter === '5_stars'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Solo 5 estrellas ({reviews.filter(r => r.rating === 5).length})</span>
          </button>
        </div>

        {/* Satisfaction Guarantee Mini Badges */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-slate-600">
          <span className="flex items-center gap-1 text-emerald-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Garantía 100%
          </span>
          <span className="flex items-center gap-1 text-sky-700 font-bold">
            <Truck className="w-3.5 h-3.5 text-sky-600" />
            Pago en Efectivo al Recibir
          </span>
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReviews.map((rev) => (
          <div 
            key={rev.id}
            className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-sky-300 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              {/* Header with Name & City */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                    {rev.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {rev.customerName}
                    </h4>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                      <MapPin className="w-3 h-3 text-sky-600" />
                      <span>{rev.customerCity}, {rev.customerDepartment}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {rev.date}
                </span>
              </div>

              {/* Stars & Product */}
              <div className="flex items-center justify-between gap-2 my-2 pb-2 border-b border-slate-200/60 text-[10px]">
                <div className="flex items-center gap-0.5 text-amber-500">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="font-mono text-slate-700 truncate max-w-[150px] font-bold" title={rev.productName}>
                  📦 {rev.productName}
                </span>
              </div>

              {/* Customer Photo (If attached) */}
              {rev.customerPhotoUrl && (
                <div className="my-2 rounded-xl overflow-hidden h-36 bg-slate-100 border border-slate-200">
                  <img 
                    src={rev.customerPhotoUrl} 
                    alt={`Foto del producto recibido por ${rev.customerName}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Comment Text */}
              <p className="text-xs text-slate-700 leading-relaxed italic">
                "{rev.comment}"
              </p>
            </div>

            {/* Carrier Verification Badge */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-500">
                Transportadora: <strong>{rev.carrier || 'Coordinadora'}</strong>
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Compra Verificada
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Review Dialog */}
      {isAddReviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">Compartir tu Experiencia de Compra</h3>
              </div>
              <button 
                onClick={() => setIsAddReviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Producto comprado:</label>
                <input 
                  type="text" 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ej: Disfraz Inflable de T-Rex, Perfume Baccara..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tu nombre completo:</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Andrés Felipe Gómez"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ciudad:</label>
                  <input 
                    type="text" 
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="Ej: Medellín, Cali..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Transportadora:</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden bg-white"
                  >
                    <option value="Servientrega">Servientrega</option>
                    <option value="Coordinadora">Coordinadora</option>
                    <option value="Inter Rapidísimo">Inter Rapidísimo</option>
                    <option value="Envía">Envía</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Calificación:</label>
                <div className="flex items-center gap-1">
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Tu opinión honesta:</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Cuéntanos cómo fue la entrega en tu casa, el pago contra entrega y el funcionamiento del producto..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden min-h-[75px]"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  Enviar Opinión
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddReviewOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
