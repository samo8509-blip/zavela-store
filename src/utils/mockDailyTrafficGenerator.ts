import { Product } from '../types/index.ts';

export interface SimulatedProductMetric {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  imagen: string;
  visitas: number; // entre 50 y 380 vistas
  tiempo_promedio_segundos: number; // tiempo de permanencia promedio
  agregados_carrito: number; // veces agregado al carrito
  compras: number; // compras cerradas efectivas
  ingresos_generados: number; // compras * precio
  conversion_tasa: string; // ej. "6.5%"
  conversionNum: number;
  es_estrella?: boolean;
  es_friccion?: boolean; // muchas visitas pero pocas o 0 compras
}

export interface SimulatedDailyTrafficReport {
  timestamp: string;
  total_visualizaciones: number;
  total_compras: number;
  total_pedidos: number;
  total_ingresos: number;
  ticket_promedio: number;
  metodo_pago_predominante: string;
  total_carritos_abandonados: number;
  tasa_conversion_promedio: string;
  tiempo_promedio_general_segundos: number;
  productos: SimulatedProductMetric[];
  productos_top_ingresos: SimulatedProductMetric[];
  productos_top_visitas: SimulatedProductMetric[];
}

const STORAGE_KEY_SIMULATED_TRAFFIC = 'cm_daily_mock_traffic';

// Pre-defined realistic catalog items for Colombian e-commerce trends
export const DEFAULT_MOCK_CATALOG = [
  {
    id: 'prod-sim-1',
    nombre: 'Disfraz Inflable de T-Rex Jurassic Park',
    categoria: 'Halloween y Temporada',
    precio: 145000,
    imagen: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600'
  },
  {
    id: 'prod-sim-2',
    nombre: 'Máscara LED La Purga Neón Halloween',
    categoria: 'Halloween y Temporada',
    precio: 58000,
    imagen: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?w=600'
  },
  {
    id: 'prod-sim-3',
    nombre: 'Cámara de Seguridad Wifi 360° Exterior Solar',
    categoria: 'Seguridad y Tecnología',
    precio: 189000,
    imagen: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600'
  },
  {
    id: 'prod-sim-4',
    nombre: 'Proyector Galaxia Láser Astronauta 3D',
    categoria: 'Hogar y Tecnología',
    precio: 98000,
    imagen: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'
  },
  {
    id: 'prod-sim-5',
    nombre: 'Perfume Sauvage Dior Elixir Concentrado',
    categoria: 'Perfumería Masculina',
    precio: 135000,
    imagen: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600'
  },
  {
    id: 'prod-sim-6',
    nombre: 'Reloj Inteligente Smartwatch Ultra Pro 49mm',
    categoria: 'Smartwatches y Wearables',
    precio: 119000,
    imagen: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'
  },
  {
    id: 'prod-sim-7',
    nombre: 'Mini Impresora Térmica Portátil Bluetooth',
    categoria: 'Accesorios y Oficina',
    precio: 72000,
    imagen: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600'
  },
  {
    id: 'prod-sim-8',
    nombre: 'Lámpara Luna 3D Táctil Multicolor USB',
    categoria: 'Hogar y Decoración',
    precio: 49000,
    imagen: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600'
  }
];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates realistic daily simulated traffic and sales for catalog products
 */
export function generateDailyTrafficReport(catalogProducts: Product[] = []): SimulatedDailyTrafficReport {
  let baseItems: Array<{ id: string; nombre: string; categoria: string; precio: number; imagen: string }> = [];

  if (catalogProducts && catalogProducts.length > 0) {
    baseItems = catalogProducts.slice(0, 8).map((p, idx) => ({
      id: p.id,
      nombre: p.title,
      categoria: p.categoryName || 'General',
      precio: p.price || 85000,
      imagen: p.images?.[0] || DEFAULT_MOCK_CATALOG[idx % DEFAULT_MOCK_CATALOG.length].imagen
    }));
  }

  // Ensure at least 6 products by supplementing with DEFAULT_MOCK_CATALOG
  if (baseItems.length < 6) {
    for (const mock of DEFAULT_MOCK_CATALOG) {
      if (!baseItems.some(b => b.nombre.toLowerCase() === mock.nombre.toLowerCase())) {
        baseItems.push(mock);
      }
      if (baseItems.length >= 8) break;
    }
  }

  // Generate randomized stats per product
  const simulatedList: SimulatedProductMetric[] = baseItems.map((item, idx) => {
    let visitas = 0;
    let compras = 0;
    let es_estrella = false;
    let es_friccion = false;

    if (idx === 0) {
      // Star Product (High traffic, high orders)
      visitas = getRandomInt(310, 380);
      compras = getRandomInt(16, 24);
      es_estrella = true;
    } else if (idx === 1) {
      // Friction Product (High traffic, 0 to 1 purchase)
      visitas = getRandomInt(240, 320);
      compras = getRandomInt(0, 2);
      es_friccion = true;
    } else if (idx === 2) {
      visitas = getRandomInt(180, 260);
      compras = getRandomInt(8, 14);
    } else if (idx === 3) {
      visitas = getRandomInt(130, 210);
      compras = getRandomInt(5, 10);
    } else {
      visitas = getRandomInt(55, 160);
      compras = getRandomInt(1, 6);
    }

    const tiempo_promedio_segundos = getRandomInt(45, 185);
    const agregados_carrito = Math.max(compras + getRandomInt(4, 16), Math.round(visitas * (getRandomInt(8, 18) / 100)));
    const convRate = visitas > 0 ? (compras / visitas) * 100 : 0;
    const conversion_tasa = `${convRate.toFixed(1)}%`;
    const ingresos_generados = compras * item.precio;

    return {
      id: item.id,
      nombre: item.nombre,
      categoria: item.categoria,
      precio: item.precio,
      imagen: item.imagen,
      visitas,
      tiempo_promedio_segundos,
      agregados_carrito,
      compras,
      ingresos_generados,
      conversion_tasa,
      conversionNum: convRate,
      es_estrella,
      es_friccion
    };
  });

  // Top by visits
  const productos_top_visitas = [...simulatedList].sort((a, b) => b.visitas - a.visitas);
  // Top by revenue
  const productos_top_ingresos = [...simulatedList].sort((a, b) => b.ingresos_generados - a.ingresos_generados);

  const total_visualizaciones = simulatedList.reduce((acc, p) => acc + p.visitas, 0);
  const total_compras = simulatedList.reduce((acc, p) => acc + p.compras, 0);
  const total_pedidos = total_compras;
  const total_ingresos = simulatedList.reduce((acc, p) => acc + p.ingresos_generados, 0);
  const ticket_promedio = total_pedidos > 0 ? Math.round(total_ingresos / total_pedidos) : 0;
  const total_carritos = simulatedList.reduce((acc, p) => acc + p.agregados_carrito, 0);
  const total_carritos_abandonados = Math.max(0, total_carritos - total_compras);
  const avgRate = total_visualizaciones > 0 ? (total_compras / total_visualizaciones) * 100 : 0;
  const avgTime = Math.round(simulatedList.reduce((acc, p) => acc + p.tiempo_promedio_segundos, 0) / Math.max(1, simulatedList.length));

  const report: SimulatedDailyTrafficReport = {
    timestamp: new Date().toISOString(),
    total_visualizaciones,
    total_compras,
    total_pedidos,
    total_ingresos,
    ticket_promedio,
    metodo_pago_predominante: 'Pago Contra Entrega (88%)',
    total_carritos_abandonados,
    tasa_conversion_promedio: `${avgRate.toFixed(1)}%`,
    tiempo_promedio_general_segundos: avgTime,
    productos: productos_top_visitas,
    productos_top_visitas,
    productos_top_ingresos
  };

  try {
    localStorage.setItem(STORAGE_KEY_SIMULATED_TRAFFIC, JSON.stringify(report));
  } catch (e) {
    console.warn('Error saving simulated traffic report to localStorage:', e);
  }

  return report;
}

/**
 * Retrieves the stored simulated traffic report or generates a new one
 */
export function getOrGenerateDailyTrafficReport(catalogProducts: Product[] = []): SimulatedDailyTrafficReport {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SIMULATED_TRAFFIC);
    if (stored) {
      const parsed: SimulatedDailyTrafficReport = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.productos) && parsed.productos.length > 0) {
        // Ensure new fields are present if loaded from old cache
        if (parsed.total_ingresos === undefined) {
          return generateDailyTrafficReport(catalogProducts);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading stored simulated traffic:', e);
  }

  return generateDailyTrafficReport(catalogProducts);
}
