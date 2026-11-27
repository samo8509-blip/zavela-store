import React from 'react';

/**
 * Banda de cifras grandes para romper el ritmo de bloques blancos.
 * Solo usa datos que la tienda ya promete: envío gratis, 2 a 5 días hábiles y garantía de 10 días.
 */
const NUMBERS = [
  { n: '$0', d: 'de envío, a toda Colombia' },
  { n: '2 a 5', d: 'días hábiles hasta tu puerta' },
  { n: '10', d: 'días de garantía por defectos de fábrica' },
];

export const HomeNumbersBand: React.FC = () => (
  <section
    aria-label="Compra con tranquilidad"
    className="zs-font rounded-[28px] border-[3px] border-black text-black overflow-hidden"
    style={{ background: '#ffd23f' }}
  >
    <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x-[3px] max-sm:divide-y-[3px] divide-black">
      {NUMBERS.map(({ n, d }) => (
        <div key={n} className="px-6 py-6 sm:px-8 sm:py-9 text-center sm:text-left">
          <div className="zs-display text-6xl sm:text-7xl leading-none">{n}</div>
          <div className="mt-2 text-sm sm:text-base font-medium leading-snug max-w-[16rem] max-sm:mx-auto">{d}</div>
        </div>
      ))}
    </div>
    <p className="border-t-[3px] border-black px-6 py-3 sm:px-8 text-center sm:text-left text-sm sm:text-base font-semibold">
      Pagas en efectivo cuando lo recibes en tus manos.
    </p>
  </section>
);
