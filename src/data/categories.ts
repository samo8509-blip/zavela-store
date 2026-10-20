import { Category } from '../types/index.ts';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-navidad',
    name: '🎄 Artículos Navideños',
    slug: 'navidad-diciembre',
    active: true,
    icon: 'Gift',
    description: 'Luces navideñas inteligentes, árboles nevados, proyectores láser 3D, guirnaldas y decoración especial con pago contra entrega.',
    order: 0,
    subcategories: [
      { id: 'sub-nav-1', name: 'Luces y Proyectores LED', slug: 'luces-proyectores', active: true },
      { id: 'sub-nav-2', name: 'Árboles y Coronas', slug: 'arboles-coronas', active: true },
      { id: 'sub-nav-3', name: 'Decoración Exterior e Inflables', slug: 'inflables-exterior', active: true },
      { id: 'sub-nav-4', name: 'Regalos Navideños', slug: 'regalos-navidenos', active: true }
    ]
  },
  {
    id: 'cat-2',
    name: '🍳 Hogar y Cocina',
    slug: 'hogar-cocina',
    active: true,
    icon: 'Home',
    description: 'Soluciones inteligentes, electrodomésticos portátiles y decoración para el hogar.',
    order: 1,
    subcategories: [
      { id: 'sub-4', name: 'Cocina Práctica', slug: 'cocina-practica', active: true },
      { id: 'sub-5', name: 'Iluminación y Ambiente', slug: 'iluminacion-ambiente', active: true },
      { id: 'sub-6', name: 'Organización del Hogar', slug: 'organizacion', active: true }
    ]
  },
  {
    id: 'cat-3',
    name: '📱 Tecnología y Gadgets',
    slug: 'tecnologia',
    active: true,
    icon: 'Smartphone',
    description: 'Smartwatches, audio inalámbrico y accesorios de última tecnología.',
    order: 2,
    subcategories: [
      { id: 'sub-7', name: 'Smartwatches y Pulseras', slug: 'smartwatches', active: true },
      { id: 'sub-8', name: 'Audio Bluetooth y Diademas', slug: 'audio-bluetooth', active: true },
      { id: 'sub-9', name: 'Accesorios y Soportes', slug: 'accesorios-moviles', active: true }
    ]
  },
  {
    id: 'cat-1',
    name: '💎 Belleza y Cuidado Personal',
    slug: 'belleza-cuidado',
    active: true,
    icon: 'Sparkles',
    description: 'Perfumería fina de mujer y hombre, combos exclusivos de fragancias, cuidado capilar y bienestar personal.',
    order: 3,
    subcategories: [
      { id: 'sub-perfumeria', name: 'Perfumería & Fragancias', slug: 'perfumeria-fragancias', active: true },
      { id: 'sub-perfumes-mujer', name: 'Perfumes de Mujer', slug: 'perfumes-mujer', active: true },
      { id: 'sub-perfumes-hombre', name: 'Perfumes de Hombre', slug: 'perfumes-hombre', active: true },
      { id: 'sub-perfumes-combos', name: 'Perfumes en Combo & Dúos', slug: 'perfumes-combos', active: true },
      { id: 'sub-1', name: 'Cuidado Capilar y Facial', slug: 'cuidado-capilar', active: true }
    ]
  },
  {
    id: 'cat-amor-amistad',
    name: '💖 Amor y Amistad',
    slug: 'amor-y-amistad',
    active: true,
    icon: 'Heart',
    description: 'Especial Amor y Amistad: Joyería de pareja, rosas preservadas LED, proyectores y regalos inolvidables.',
    order: 4,
    subcategories: [
      { id: 'sub-amor-1', name: 'Detalles y Rosas LED', slug: 'detalles-rosas', active: true },
      { id: 'sub-amor-2', name: 'Joyería & Pulseras de Pareja', slug: 'joyeria-parejas', active: true },
      { id: 'sub-amor-3', name: 'Relojes & Accesorios Dúo', slug: 'relojes-duo', active: true }
    ]
  },
  {
    id: 'cat-halloween',
    name: '🎃 Halloween & Disfraces',
    slug: 'halloween-disfraces',
    active: true,
    icon: 'Ghost',
    description: 'Disfraces impactantes, máscaras LED de neón, proyectores de terror y disfraces para mascotas.',
    order: 5,
    subcategories: [
      { id: 'sub-halo-1', name: 'Disfraces y Máscaras LED', slug: 'disfraces-adultos-ninos', active: true },
      { id: 'sub-halo-3', name: 'Decoración Terror & Calderos', slug: 'decoracion-terror-niebla', active: true }
    ]
  },
  {
    id: 'cat-4',
    name: '🏃 Salud y Fitness',
    slug: 'salud-fitness',
    active: true,
    icon: 'Activity',
    description: 'Equipos de masaje, terapia muscular y accesorios de entrenamiento.',
    order: 6,
    subcategories: [
      { id: 'sub-10', name: 'Masajeadores y Terapia', slug: 'masajeadores', active: true },
      { id: 'sub-11', name: 'Postura y Soporte', slug: 'postura-soporte', active: true }
    ]
  }
];
