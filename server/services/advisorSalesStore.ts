/**
 * Ventas de asesores: liga cada pedido con el asesor que lo trajo y guarda su comisión.
 * Tabla `zavela_ventas_asesor` en MySQL (+ cache en memoria). Sin MySQL usa `.advisor_sales.json` (fuera de git).
 *
 * Estados de la comisión de un pedido:
 *   en_proceso      pedido aún no entregado
 *   esperando_dropi entregado, pero Dropi todavía no nos paga ese pedido
 *   por_pagar       Dropi ya pagó (lo marca el administrador); la comisión queda congelada y entra al próximo corte
 *   pagada          ya liquidada al asesor
 *   anulada         pedido cancelado / devuelto
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Order } from '../../src/types/index.ts';

export type CommissionStatus = 'en_proceso' | 'esperando_dropi' | 'por_pagar' | 'pagada' | 'anulada';

export interface SaleAttribution {
  orderId: string;
  advisorId: string;
  sellerCode: string;
  advisorName: string;
  channel: string;
  commissionRate: number;          // % de la rentabilidad neta
  commissionAmount?: number;       // congelada al marcar "Dropi ya pagó"
  netProfitAtPayment?: number;
  dropiPaidAt?: string;
  paidAt?: string;
  settlementRef?: string;
  createdAt: string;
}

const FILE = path.join(process.cwd(), '.advisor_sales.json');
let cache = new Map<string, SaleAttribution>();
let mysqlOk = false;
const getPool = async () => (await import('../mysqlPool.ts')).nativePool;

const rowToAttr = (r: any): SaleAttribution => ({
  orderId: r.order_id, advisorId: r.advisor_id, sellerCode: r.codigo || '', advisorName: r.asesor || '',
  channel: r.canal || '', commissionRate: Number(r.comision_pct ?? 25),
  commissionAmount: r.comision_monto == null ? undefined : Number(r.comision_monto),
  netProfitAtPayment: r.ganancia_neta == null ? undefined : Number(r.ganancia_neta),
  dropiPaidAt: r.dropi_pago ? new Date(r.dropi_pago).toISOString() : undefined,
  paidAt: r.pagada_at ? new Date(r.pagada_at).toISOString() : undefined,
  settlementRef: r.liquidacion_ref || undefined,
  createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
});

export async function loadSales(): Promise<void> {
  try {
    const p = await getPool();
    if (p) {
      await p.query(`CREATE TABLE IF NOT EXISTS zavela_ventas_asesor (
        order_id VARCHAR(64) NOT NULL PRIMARY KEY, advisor_id VARCHAR(64) NOT NULL, codigo VARCHAR(32) NULL,
        asesor VARCHAR(255) NULL, canal VARCHAR(100) NULL, comision_pct DECIMAL(5,2) NOT NULL DEFAULT 25,
        comision_monto DECIMAL(14,2) NULL, ganancia_neta DECIMAL(14,2) NULL, dropi_pago DATETIME NULL,
        pagada_at DATETIME NULL, liquidacion_ref VARCHAR(64) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_asesor (advisor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      const [rows]: any = await p.query('SELECT * FROM zavela_ventas_asesor');
      cache = new Map((rows || []).map((r: any) => [r.order_id, rowToAttr(r)]));
      mysqlOk = true;
      return;
    }
  } catch (e: any) {
    console.warn('[VentasAsesor] No se pudo usar MySQL:', e?.message);
  }
  try { cache = new Map((JSON.parse(fs.readFileSync(FILE, 'utf8')) as SaleAttribution[]).map(a => [a.orderId, a])); } catch { cache = new Map(); }
}

const d = (v?: string) => (v ? new Date(v) : null);
async function persist(a: SaleAttribution): Promise<void> {
  if (mysqlOk) {
    try {
      const p = await getPool();
      await p!.query(`INSERT INTO zavela_ventas_asesor (order_id,advisor_id,codigo,asesor,canal,comision_pct,comision_monto,ganancia_neta,dropi_pago,pagada_at,liquidacion_ref,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE advisor_id=VALUES(advisor_id),codigo=VALUES(codigo),asesor=VALUES(asesor),canal=VALUES(canal),
        comision_pct=VALUES(comision_pct),comision_monto=VALUES(comision_monto),ganancia_neta=VALUES(ganancia_neta),
        dropi_pago=VALUES(dropi_pago),pagada_at=VALUES(pagada_at),liquidacion_ref=VALUES(liquidacion_ref)`,
        [a.orderId, a.advisorId, a.sellerCode || null, a.advisorName || null, a.channel || null, a.commissionRate,
         a.commissionAmount ?? null, a.netProfitAtPayment ?? null, d(a.dropiPaidAt), d(a.paidAt), a.settlementRef || null, new Date(a.createdAt)]);
    } catch (e: any) { console.warn('[VentasAsesor] No se pudo guardar en MySQL:', e?.message); }
    return;
  }
  try { fs.writeFileSync(FILE, JSON.stringify([...cache.values()], null, 2), { mode: 0o600 }); } catch {}
}

export const getAttribution = (orderId: string) => cache.get(orderId);
export const listAttributions = () => [...cache.values()];

export function attributeOrder(orderId: string, info: Omit<SaleAttribution, 'orderId' | 'createdAt'>): SaleAttribution {
  const a: SaleAttribution = { ...info, orderId, createdAt: new Date().toISOString() };
  cache.set(orderId, a);
  void persist(a);
  return a;
}
export function removeAttribution(orderId: string): void {
  cache.delete(orderId);
  if (mysqlOk) {
    void getPool().then(p => p!.query('DELETE FROM zavela_ventas_asesor WHERE order_id = ?', [orderId])).catch(() => {});
  } else {
    try { fs.writeFileSync(FILE, JSON.stringify([...cache.values()], null, 2), { mode: 0o600 }); } catch {}
  }
}

// ---------- Cálculos ----------
const st = (o: Order) => String((o as any).status || (o as any).estado || '').toLowerCase().trim();
export const isDelivered = (o: Order) => st(o) === 'entregado';
export const isCancelled = (o: Order) => ['cancelado', 'rechazado', 'error_dropi', 'devuelto'].includes(st(o));

/** Ganancia neta real del pedido (total − costo del producto − flete − tarifa Dropi). null si no hay costos cargados. */
export function netProfitOf(o: Order): number | null {
  if (typeof o.netMargin === 'number' && !Number.isNaN(o.netMargin) && o.netMargin !== 0) return o.netMargin;
  const total = Number(o.total ?? o.totalAmount ?? 0);
  const itemsCost = (o.items || []).reduce((s, it: any) => s + Number(it.unitCost ?? it.costPrice ?? it.costo ?? 0) * Number(it.quantity || 1), 0);
  const cost = Number(o.productCostTotal || 0) || itemsCost;
  if (!cost) return null;
  const ship = Number(o.carrierFee || 0);
  const fee = Number(o.dropiFee || 0);
  return Math.round(total - cost - ship - fee);
}

export function statusOf(o: Order | undefined, a: SaleAttribution): CommissionStatus {
  if (a.paidAt) return 'pagada';
  if (a.dropiPaidAt) return 'por_pagar';
  if (o && isCancelled(o)) return 'anulada';
  if (o && isDelivered(o)) return 'esperando_dropi';
  return 'en_proceso';
}

/** Valor estimado de la comisión (si aún no está congelada). */
export function estimatedCommission(o: Order | undefined, a: SaleAttribution): number | null {
  if (a.commissionAmount != null) return a.commissionAmount;
  if (!o) return null;
  const net = netProfitOf(o);
  return net == null ? null : Math.round((a.commissionRate / 100) * Math.max(0, net));
}

/** Administrador marca que Dropi ya pagó estos pedidos: se congela la comisión y pasan a "por pagar". */
export function markDropiPaid(orders: Order[]): { ok: string[]; skipped: { orderId: string; reason: string }[] } {
  const ok: string[] = []; const skipped: { orderId: string; reason: string }[] = [];
  for (const o of orders) {
    const a = cache.get(o.id);
    if (!a) { skipped.push({ orderId: o.id, reason: 'No es una venta de asesor.' }); continue; }
    if (a.paidAt) { skipped.push({ orderId: o.id, reason: 'La comisión ya fue pagada al asesor.' }); continue; }
    if (a.dropiPaidAt) { skipped.push({ orderId: o.id, reason: 'Ya estaba marcada como pagada por Dropi.' }); continue; }
    if (!isDelivered(o)) { skipped.push({ orderId: o.id, reason: 'El pedido aún no está Entregado.' }); continue; }
    const net = netProfitOf(o);
    if (net == null) { skipped.push({ orderId: o.id, reason: 'Falta el costo del producto: complétalo para calcular la ganancia neta.' }); continue; }
    a.netProfitAtPayment = net;
    a.commissionAmount = Math.round((a.commissionRate / 100) * Math.max(0, net));
    a.dropiPaidAt = new Date().toISOString();
    void persist(a);
    ok.push(o.id);
  }
  return { ok, skipped };
}

/** Deshacer un "Dropi ya pagó" marcado por error (solo si aún no se pagó al asesor). */
export function undoDropiPaid(orderIds: string[]): string[] {
  const done: string[] = [];
  for (const id of orderIds) {
    const a = cache.get(id);
    if (!a || a.paidAt || !a.dropiPaidAt) continue;
    a.dropiPaidAt = undefined; a.commissionAmount = undefined; a.netProfitAtPayment = undefined;
    void persist(a); done.push(id);
  }
  return done;
}
