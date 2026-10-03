import React, { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, CheckCircle2, X } from 'lucide-react';
import { formatCOP } from '../utils/formatters.ts';

interface PurchaseEvent {
  customerName: string;
  city: string;
  department: string;
  productName: string;
  timeAgo: string;
  price: number;
}

const PURCHASE_POOL: PurchaseEvent[] = [
  { customerName: 'Carlos M.', city: 'Medellín', department: 'Antioquia', productName: 'Humidificador Llama LED Pro', timeAgo: 'hace 2 min', price: 98900 },
  { customerName: 'Laura G.', city: 'Bogotá D.C.', department: 'Cundinamarca', productName: 'Baccara Rouge 540 Extraît', timeAgo: 'hace 4 min', price: 189900 },
  { customerName: 'Andrés F.', city: 'Cali', department: 'Valle', productName: 'AirPods Max Spatial Audio', timeAgo: 'hace 7 min', price: 154900 },
  { customerName: 'Marcela V.', city: 'Barranquilla', department: 'Atlántico', productName: 'Luces Inteligentes RGB 3D', timeAgo: 'hace 11 min', price: 119900 },
  { customerName: 'Felipe S.', city: 'Bucaramanga', department: 'Santander', productName: 'Dispensador Smart de Alimento', timeAgo: 'hace 14 min', price: 139900 },
  { customerName: 'Diana P.', city: 'Pereira', department: 'Risaralda', productName: 'Tom Ford Lost Cherry EDP', timeAgo: 'hace 18 min', price: 195000 },
  { customerName: 'Sebastián R.', city: 'Manizales', department: 'Caldas', productName: 'Proyector Galaxia Astronauta', timeAgo: 'hace 22 min', price: 89900 },
  { customerName: 'Camila T.', city: 'Cartagena', department: 'Bolívar', productName: 'Combo Dúo Perfumería Importada', timeAgo: 'hace 26 min', price: 210000 }
];

export const RealTimePurchaseToast: React.FC = () => {
  const [currentNotification, setCurrentNotification] = useState<PurchaseEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isDismissed) return;

    // Initial popup after 4 seconds
    const initialTimeout = setTimeout(() => {
      showRandomNotification();
    }, 4000);

    // Periodic loop every 18 to 26 seconds
    const interval = setInterval(() => {
      if (!isDismissed) {
        showRandomNotification();
      }
    }, 22000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isDismissed]);

  const showRandomNotification = () => {
    const randomIdx = Math.floor(Math.random() * PURCHASE_POOL.length);
    const item = PURCHASE_POOL[randomIdx];
    setCurrentNotification(item);
    setIsVisible(true);

    // Hide after 6.5 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 6500);
  };

  if (!currentNotification || !isVisible || isDismissed) return null;

  return (
    <div 
      id="realtime-purchase-toast"
      className="social-proof-toast notification-recent-purchase compra-reciente-toast fixed bottom-20 left-4 sm:left-6 z-40 max-w-sm w-[calc(100%-2rem)] sm:w-auto bg-white text-slate-900 rounded-2xl p-3.5 sm:p-4 border-2 border-sky-400 shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto"
    >
      <div className="flex items-start justify-between gap-3">
        
        {/* Left Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <ShoppingBag className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              ¡Compra Reciente!
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {currentNotification.timeAgo}
            </span>
          </div>

          <p className="text-xs text-slate-800 font-medium leading-snug">
            <strong className="text-slate-950 font-bold">{currentNotification.customerName}</strong> en <span className="text-sky-700 font-semibold">{currentNotification.city}</span> pidió:
          </p>

          <p className="text-xs font-black text-slate-900 truncate mt-0.5" title={currentNotification.productName}>
            {currentNotification.productName}
          </p>

          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 text-[10px] font-mono">
            <span className="text-slate-500 font-bold">
              {formatCOP(currentNotification.price)}
            </span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Pago Contra Entrega
            </span>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            setIsVisible(false);
            setIsDismissed(true);
          }}
          className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          title="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
};
