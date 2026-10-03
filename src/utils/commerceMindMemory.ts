import { SimulatedDailyTrafficReport } from './mockDailyTrafficGenerator.ts';
import { formatCOP } from './formatters.ts';
import { numberToColombianPesosWords, modulateTextForNaturalSpeech } from './naturalVoiceSynthesizer.ts';

export const COMMERCEMIND_MEMORY_KEY = 'commercemind_last_summary_report';

export interface CommerceMindReportMemory {
  timestamp: string;
  dateStr: string; // YYYY-MM-DD
  totalVisitas: number;
  totalPedidos: number;
  totalIngresos: number;
  ticketPromedio: number;
  topProductoId: string;
  topProductoNombre: string;
  topProductoVisitas: number;
  topProductoCompras: number;
  metodoPago: string;
}

export type PresentationMode = 'initial_full' | 'no_changes' | 'delta_updates';

export interface ReportMemoryComparison {
  mode: PresentationMode;
  deltaPedidos: number;
  deltaIngresos: number;
  deltaVisitas: number;
  destacadoNombre: string;
  destacadoVisitasDelta: number;
  lastReport: CommerceMindReportMemory | null;
}

export function getLastReportMemory(): CommerceMindReportMemory | null {
  try {
    const raw = localStorage.getItem(COMMERCEMIND_MEMORY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading commercemind_last_summary_report from localStorage:', err);
    return null;
  }
}

export function saveReportMemory(report: SimulatedDailyTrafficReport): void {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const topProd = report.productos_top_visitas[0] || report.productos[0];

    const memory: CommerceMindReportMemory = {
      timestamp: new Date().toISOString(),
      dateStr: todayStr,
      totalVisitas: report.total_visualizaciones,
      totalPedidos: report.total_pedidos,
      totalIngresos: report.total_ingresos,
      ticketPromedio: report.ticket_promedio,
      topProductoId: topProd?.id || '',
      topProductoNombre: topProd?.nombre || 'Producto Principal',
      topProductoVisitas: topProd?.visitas || 0,
      topProductoCompras: topProd?.compras || 0,
      metodoPago: report.metodo_pago_predominante
    };

    localStorage.setItem(COMMERCEMIND_MEMORY_KEY, JSON.stringify(memory));
  } catch (err) {
    console.warn('Error saving commercemind_last_summary_report to localStorage:', err);
  }
}

export function compareWithLastReport(report: SimulatedDailyTrafficReport): ReportMemoryComparison {
  const last = getLastReportMemory();
  const todayStr = new Date().toISOString().split('T')[0];

  if (!last || last.dateStr !== todayStr) {
    return {
      mode: 'initial_full',
      deltaPedidos: 0,
      deltaIngresos: 0,
      deltaVisitas: 0,
      destacadoNombre: report.productos[0]?.nombre || '',
      destacadoVisitasDelta: 0,
      lastReport: null
    };
  }

  const deltaPedidos = report.total_pedidos - last.totalPedidos;
  const deltaIngresos = report.total_ingresos - last.totalIngresos;
  const deltaVisitas = report.total_visualizaciones - last.totalVisitas;

  // No significant changes if zero new orders and visits change is less than 6
  if (deltaPedidos === 0 && Math.abs(deltaVisitas) < 6) {
    return {
      mode: 'no_changes',
      deltaPedidos: 0,
      deltaIngresos: 0,
      deltaVisitas: 0,
      destacadoNombre: last.topProductoNombre,
      destacadoVisitasDelta: 0,
      lastReport: last
    };
  }

  const topProd = report.productos[0];

  return {
    mode: 'delta_updates',
    deltaPedidos: Math.max(0, deltaPedidos),
    deltaIngresos: Math.max(0, deltaIngresos),
    deltaVisitas: Math.max(0, deltaVisitas),
    destacadoNombre: topProd?.nombre || last.topProductoNombre,
    destacadoVisitasDelta: Math.max(0, (topProd?.visitas || 0) - last.topProductoVisitas),
    lastReport: last
  };
}

/**
 * Builds friendly and natural Spanish speech script adapted to the report mode
 */
export function buildUnifiedSpeechScript(
  report: SimulatedDailyTrafficReport,
  comparison: ReportMemoryComparison,
  forceFull: boolean = false
): string {
  const starProd = report.productos.find(p => p.es_estrella) || report.productos[0];
  const frictionProd = report.productos.find(p => p.es_friccion) || report.productos[1];

  const starName = starProd ? starProd.nombre : 'Disfraz Inflable de T-Rex';
  const starVisits = starProd ? starProd.visitas : 340;
  const starOrders = starProd ? starProd.compras : 18;
  const starRevenue = starProd ? starProd.ingresos_generados : 2610000;

  const frictionName = frictionProd ? frictionProd.nombre : 'Máscara LED La Purga';
  const frictionVisits = frictionProd ? frictionProd.visitas : 280;
  const frictionOrders = frictionProd ? frictionProd.compras : 1;

  const totalIngresosPalabras = numberToColombianPesosWords(report.total_ingresos);
  const ticketPromedioPalabras = numberToColombianPesosWords(report.ticket_promedio);
  const starRevenuePalabras = numberToColombianPesosWords(starRevenue);

  // Case 1: No significant changes since last review and not forced full
  if (!forceFull && comparison.mode === 'no_changes') {
    const raw = `¡Hola de nuevo!... Ya estás al día con el informe anterior. ` +
      `No se registran cambios importantes desde la última revisión: seguimos con ${report.total_pedidos} pedidos completados ` +
      `por un total de ${totalIngresosPalabras} en el día, con la modalidad de Pago Contra Entrega en efectivo como el método preferido por los compradores... ` +
      `Si deseas repasar todo el catálogo en detalle, puedes pulsar el botón de forzar lectura completa.`;
    return modulateTextForNaturalSpeech(raw);
  }

  // Case 2: New sales or significant traffic arrived since last review
  if (!forceFull && comparison.mode === 'delta_updates') {
    const deltaIngresosPalabras = numberToColombianPesosWords(comparison.deltaIngresos);
    const newsDetails = comparison.deltaPedidos > 0
      ? `Se registraron ${comparison.deltaPedidos} nuevas ventas por un total adicional de ${deltaIngresosPalabras}, con recaudo contra entrega al entregar... `
      : `El volumen de tráfico creció con ${comparison.deltaVisitas} nuevas visitas al catálogo de la tienda... `;

    const prodUpdate = comparison.destacadoNombre
      ? `El producto ${comparison.destacadoNombre} sumó ${comparison.destacadoVisitasDelta > 0 ? `${comparison.destacadoVisitasDelta} visitas más` : 'atención continua'}... `
      : '';

    const raw = `¡Hay novedades comerciales desde tu última revisión!... ` +
      newsDetails +
      prodUpdate +
      `En total acumulamos hoy ${report.total_pedidos} pedidos confirmados con ingresos de ${totalIngresosPalabras}, ` +
      `y ${report.total_visualizaciones} visualizaciones en la tienda... ¡Excelente dinamismo para nuestro negocio!`;
    return modulateTextForNaturalSpeech(raw);
  }

  // Case 3: Initial full report of the day or user clicked "Forzar lectura completa"
  const raw = `¡Hola!... Te presento el balance unificado de tráfico y ventas de hoy en Zavela Store. ` +
    `En el frente de ventas, registramos ${report.total_pedidos} pedidos completados con ingresos totales de ${totalIngresosPalabras}... ` +
    `Mantenemos un ticket promedio de ${ticketPromedioPalabras}, siendo el Pago Contra Entrega en efectivo el método favorito elegido por los clientes en Colombia... ` +
    `En tráfico, acumulamos ${report.total_visualizaciones} visualizaciones en el catálogo. ` +
    `Nuestro producto estrella en atención y ventas es el ${starName}, con ${starVisits} visualizaciones y ${starOrders} ventas cerradas, generando ${starRevenuePalabras}... ` +
    `Sin embargo, detectamos una oportunidad en el producto ${frictionName}, que tiene alta atención con ${frictionVisits} visualizaciones pero solo ${frictionOrders} compras... ` +
    `Te sugiero revisar el precio o crear un combo con envío gratis para convertir ese alto interés en ventas inmediatas... ` +
    `¡Muchos éxitos en la jornada comercial!`;
  return modulateTextForNaturalSpeech(raw);
}
