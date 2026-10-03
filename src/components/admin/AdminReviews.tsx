import React, { useState } from 'react';
import { 
  Star, 
  CheckCircle2, 
  AlertTriangle, 
  ThumbsUp, 
  MessageSquare, 
  ShieldCheck, 
  Search, 
  Filter, 
  Check, 
  Clock, 
  Package, 
  Truck, 
  RefreshCw, 
  MapPin, 
  Sparkles,
  ArrowRight,
  Send
} from 'lucide-react';
import { Product } from '../../types/index.ts';
import { 
  ProductReview, 
  getAllReviews, 
  updateReviewAdmin 
} from '../../utils/reviewsManager.ts';

interface AdminReviewsProps {
  products: Product[];
  showToast?: (msg: string) => void;
}

export const AdminReviews: React.FC<AdminReviewsProps> = ({ products, showToast }) => {
  const [reviews, setReviews] = useState<ProductReview[]>(() => getAllReviews());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});

  const refreshReviews = () => {
    setReviews(getAllReviews());
  };

  const handleResolve = (reviewId: string) => {
    const updated = updateReviewAdmin(reviewId, { resolved: true });
    setReviews(updated);
    if (showToast) {
      showToast('✅ Reclamo marcado como resuelto.');
    }
  };

  const handleSaveResponse = (reviewId: string) => {
    const reply = replyTextMap[reviewId] || '';
    if (!reply.trim()) return;

    const updated = updateReviewAdmin(reviewId, { adminResponse: reply.trim(), resolved: true });
    setReviews(updated);
    if (showToast) {
      showToast('💬 Respuesta y acción correctiva guardada con éxito.');
    }
  };

  // Metrics
  const totalReviews = reviews.length;
  const positiveReviews = reviews.filter(r => r.rating >= 4);
  const neutralReviews = reviews.filter(r => r.rating === 3);
  const negativeReviews = reviews.filter(r => r.rating <= 2);
  const pendingComplaints = reviews.filter(r => r.rating <= 3 && !r.resolved);
  const averageRating = totalReviews > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '5.0';
  const satisfactionRate = totalReviews > 0
    ? Math.round((positiveReviews.length / totalReviews) * 100)
    : 100;

  // Filtered List
  const filteredReviews = reviews.filter(r => {
    if (selectedFilter === 'positive' && r.rating < 4) return false;
    if (selectedFilter === 'neutral' && r.rating !== 3) return false;
    if (selectedFilter === 'negative' && r.rating > 2) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.productName.toLowerCase().includes(q);
      const matchCustomer = r.customerName.toLowerCase().includes(q);
      const matchCity = r.customerCity.toLowerCase().includes(q);
      const matchComment = r.comment.toLowerCase().includes(q);
      if (!matchName && !matchCustomer && !matchCity && !matchComment) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              REPUTACIÓN & CALIDAD • ZAVELA STORE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Sistema de Calificaciones y Reseñas de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitorea el nivel de satisfacción, testimonios verificados de compradores y resuelve oportunidades de mejora.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshReviews}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Refrescar Reseñas</span>
        </button>
      </div>

      {/* KPI Cards: Satisfaction & Ratings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>Calificación Promedio</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {averageRating} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <span className="text-[10px] text-amber-600 font-bold mt-1">Alta confianza del consumidor</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>Satisfacción Positiva</span>
            <ThumbsUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-600">
            {satisfactionRate}%
          </div>
          <span className="text-[10px] text-slate-500 mt-1">{positiveReviews.length} reseñas 4 y 5 estrellas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>Total Testimonios</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
            {totalReviews}
          </div>
          <span className="text-[10px] text-sky-600 font-bold mt-1">100% compras verificadas</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            <span>Quejas Pendientes</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600">
            {pendingComplaints.length}
          </div>
          <span className="text-[10px] text-slate-500 mt-1">
            {pendingComplaints.length === 0 ? 'Todas resueltas' : 'Requieren acción inmediata'}
          </span>
        </div>
      </div>

      {/* SECCIÓN DESTACADA: OPORTUNIDADES DE MEJORA / RESEÑAS NEGATIVAS */}
      {negativeReviews.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white rounded-3xl p-6 sm:p-8 border border-rose-800/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-rose-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-rose-400">
                  Panel de Alerta Temprana
                </span>
                <h2 className="text-base sm:text-lg font-black text-white">
                  Oportunidades de Mejora & Reseñas Críticas (1 a 3 Estrellas)
                </h2>
              </div>
            </div>

            <span className="text-xs font-mono text-rose-300 bg-rose-900/40 px-3 py-1 rounded-full border border-rose-700/50">
              {negativeReviews.length} comentarios de clientes por optimizar
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {negativeReviews.map((rev) => (
              <div 
                key={rev.id}
                className="bg-slate-950/80 border border-rose-500/30 rounded-2xl p-5 space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Motivo: {rev.complaintCategory === 'tiempo_envio' ? 'Demora Transportadora' : rev.complaintCategory === 'empaque' ? 'Empaque / Caja' : rev.complaintCategory === 'talla_tamano' ? 'Talla o Ajuste' : 'Calidad'}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rev.resolved 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    }`}>
                      {rev.resolved ? 'Resuelto' : 'Acción Pendiente'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {rev.productName}
                  </h3>
                  
                  <div className="flex items-center gap-1 my-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                    ))}
                    <span className="text-xs font-mono text-slate-400 ml-1.5">
                      {rev.customerName} ({rev.customerCity}) • {rev.carrier}
                    </span>
                  </div>

                  <p className="text-xs text-rose-100 bg-rose-950/40 p-3 rounded-xl border border-rose-900/50 leading-relaxed mt-2">
                    "{rev.comment}"
                  </p>
                </div>

                {/* Admin Internal Corrective Action / Response Box */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  {rev.adminResponse ? (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-200">
                      <strong className="block text-[10px] uppercase text-emerald-400">Acción Correctiva Registrada:</strong>
                      {rev.adminResponse}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input 
                        type="text"
                        value={replyTextMap[rev.id] || ''}
                        onChange={(e) => setReplyTextMap(prev => ({ ...prev, [rev.id]: e.target.value }))}
                        placeholder="Escribe la acción correctiva (ej: Contactado por WhatsApp para reposición)..."
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs rounded-xl text-white placeholder:text-slate-500 focus:border-rose-400 outline-hidden"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveResponse(rev.id)}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Guardar Solución</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!rev.resolved && (
                    <button
                      type="button"
                      onClick={() => handleResolve(rev.id)}
                      className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Marcar como resuelto</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER AND SEARCH CONTROLS */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Rating Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Todas ({totalReviews})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('positive')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'positive'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Positivas 4-5★ ({positiveReviews.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('neutral')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'neutral'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
            }`}
          >
            Neutras 3★ ({neutralReviews.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedFilter('negative')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedFilter === 'negative'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Críticas 1-2★ ({negativeReviews.length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente o producto..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-sky-500 outline-hidden"
          />
        </div>
      </div>

      {/* REVIEWS GRID / LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReviews.map((rev) => (
          <div 
            key={rev.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:shadow-xs transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star 
                      key={s} 
                      className={`w-3.5 h-3.5 ${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-slate-400">{rev.date}</span>
              </div>

              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                {rev.productName}
              </h4>

              <div className="text-[11px] text-slate-500 flex items-center gap-1 my-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{rev.customerName} • {rev.customerCity}, {rev.customerDepartment}</span>
              </div>

              {rev.customerPhotoUrl && (
                <div className="my-2 rounded-xl overflow-hidden h-28 bg-slate-100 border border-slate-200">
                  <img 
                    src={rev.customerPhotoUrl} 
                    alt="Foto del cliente" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{rev.comment}"
              </p>
            </div>

            {/* Badges & Carrier */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Verificado
              </span>
              {rev.carrier && (
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3 text-sky-600" />
                  {rev.carrier}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
