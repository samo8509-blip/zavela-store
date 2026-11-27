import React from 'react';
import { Banknote, Truck, PackageSearch, MessageCircle } from 'lucide-react';

/**
 * Franja corta de confianza para la portada. Solo dice lo que la tienda ya promete en la barra superior:
 * pago contra entrega, envío gratis nacional, número de guía y atención por WhatsApp.
 */
const ITEMS = [
  { Icon: Banknote, t: 'Pagas al recibir', d: 'Sin tarjeta y sin pagar por adelantado' },
  { Icon: Truck, t: 'Envío gratis', d: 'A toda Colombia' },
  { Icon: PackageSearch, t: 'Sigue tu pedido', d: 'Con número de guía' },
  { Icon: MessageCircle, t: 'Te atendemos', d: 'Por WhatsApp' },
];

export const HomeTrustStrip: React.FC = () => (
  <section
    aria-label="Por qué comprar en Zavela Store"
    className="zs-font grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
  >
    {ITEMS.map(({ Icon, t, d }) => (
      <div
        key={t}
        className="flex items-center gap-2.5 bg-white rounded-2xl border border-black/5 px-3 py-2.5 sm:px-4 sm:py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      >
        <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,210,63,0.35)' }}>
          <Icon className="w-[18px] h-[18px] text-black" strokeWidth={2} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[13px] sm:text-sm font-semibold text-black truncate">{t}</span>
          <span className="block text-[11px] sm:text-xs text-[color:var(--shop-muted)] max-md:line-clamp-2">{d}</span>
        </span>
      </div>
    ))}
  </section>
);
