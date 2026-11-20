/**
 * Liquidación de comisiones: ciclos (quincenal / mensual), historial de liquidaciones y estado de cuenta.
 * Fechas en hora de Colombia (UTC-5, sin horario de verano).
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Advisor, AdvisorSale } from '../../src/types/index.ts';

export interface Settlement {
  id: string;
  advisorId: string;
  advisorName: string;
  sellerCode: string;
  orderIds: string[];
  count: number;
  total: number;
  periodFrom: string;   // YYYY-MM-DD
  periodTo: string;
  method: string;
  reference: string;
  notes: string;
  paidAt: string;       // ISO
  emailed: boolean;
}

const FILE = path.join(process.cwd(), '.settlements.json');
let cache: Settlement[] = [];
let mysqlOk = false;
const getPool = async () => (await import('../mysqlPool.ts')).nativePool;

export async function loadSettlements(): Promise<void> {
  try {
    const p = await getPool();
    if (p) {
      await p.query(`CREATE TABLE IF NOT EXISTS zavela_liquidaciones (
        id VARCHAR(40) NOT NULL PRIMARY KEY, advisor_id VARCHAR(64) NOT NULL, datos MEDIUMTEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, KEY idx_asesor (advisor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      const [rows]: any = await p.query('SELECT datos FROM zavela_liquidaciones ORDER BY created_at DESC');
      cache = (rows || []).map((r: any) => { try { return JSON.parse(r.datos); } catch { return null; } }).filter(Boolean);
      mysqlOk = true;
      return;
    }
  } catch (e: any) { console.warn('[Liquidaciones] No se pudo usar MySQL:', e?.message); }
  try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { cache = []; }
}

async function persist(s: Settlement): Promise<void> {
  if (mysqlOk) {
    try {
      const p = await getPool();
      await p!.query(`INSERT INTO zavela_liquidaciones (id, advisor_id, datos) VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE datos = VALUES(datos)`, [s.id, s.advisorId, JSON.stringify(s)]);
    } catch (e: any) { console.warn('[Liquidaciones] No se pudo guardar:', e?.message); }
    return;
  }
  try { fs.writeFileSync(FILE, JSON.stringify(cache, null, 2), { mode: 0o600 }); } catch {}
}

export const listSettlements = (advisorId?: string) => cache.filter(s => !advisorId || s.advisorId === advisorId);

export function createSettlement(input: Omit<Settlement, 'id' | 'paidAt' | 'emailed'>): Settlement {
  const day = ymd(bogotaNow()).replace(/-/g, '');
  const n = cache.filter(s => s.id.startsWith(`LQ-${day}`)).length + 1;
  const s: Settlement = { ...input, id: `LQ-${day}-${String(n).padStart(2, '0')}`, paidAt: new Date().toISOString(), emailed: false };
  cache.unshift(s);
  void persist(s);
  return s;
}
export function markEmailed(id: string) {
  const s = cache.find(x => x.id === id);
  if (s) { s.emailed = true; void persist(s); }
}

// ---------- Fechas (Colombia) ----------
export const bogotaNow = () => new Date(Date.now() - 5 * 3600 * 1000);          // sus campos UTC son la hora de Colombia
export const ymd = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const mk = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[m - 1]} ${y}`;
};
export const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export interface CycleInfo {
  cycle: 'quincenal' | 'mensual';
  periodFrom: string; periodTo: string;   // período en curso
  nextCutoff: string;                     // próxima fecha de corte (puede ser hoy)
  payDate: string;                        // fecha prometida de pago de ese corte
  daysToCutoff: number;
}

export function cycleInfo(advisor: Pick<Advisor, 'payoutCycle' | 'payoutDelayDays'>, now = bogotaNow()): CycleInfo {
  const cycle = advisor.payoutCycle === 'mensual' ? 'mensual' : 'quincenal';
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  const last = lastDay(y, m);
  let from: Date, to: Date;
  if (cycle === 'mensual') { from = mk(y, m, 1); to = mk(y, m, last); }
  else if (d <= 15) { from = mk(y, m, 1); to = mk(y, m, 15); }
  else { from = mk(y, m, 16); to = mk(y, m, last); }
  const delay = Math.min(30, Math.max(0, Number(advisor.payoutDelayDays ?? 3)));
  const pay = new Date(to.getTime() + delay * 86400000);
  const today = mk(y, m, d);
  return { cycle, periodFrom: ymd(from), periodTo: ymd(to), nextCutoff: ymd(to), payDate: ymd(pay), daysToCutoff: Math.round((to.getTime() - today.getTime()) / 86400000) };
}

/** ¿Hoy es día de corte para este asesor? */
export const isCutoffToday = (advisor: Pick<Advisor, 'payoutCycle' | 'payoutDelayDays'>, now = bogotaNow()) => cycleInfo(advisor, now).daysToCutoff === 0;

// ---------- Estado de cuenta ----------
export function statementText(advisor: Advisor, s: Settlement, sales: AdvisorSale[]): string {
  const byId = new Map(sales.map(x => [x.id, x]));
  const lines = s.orderIds.map(id => {
    const x = byId.get(id);
    return x ? `• ${x.orderNumber} · ${x.clientName} · ${x.productTitle} — comisión ${cop(Number(x.commissionAmount || 0))}` : `• ${id}`;
  });
  return `Hola ${advisor.name.split(' ')[0]},

Te enviamos el detalle de tu liquidación de comisiones de Zavela Store.

Liquidación: ${s.id}
Período: ${fmtDate(s.periodFrom)} a ${fmtDate(s.periodTo)}
Fecha de pago: ${fmtDate(s.paidAt)}
Medio de pago: ${s.method || 'No indicado'}${s.reference ? `\nReferencia: ${s.reference}` : ''}

Ventas incluidas (${s.count}):
${lines.join('\n')}

TOTAL PAGADO: ${cop(s.total)}
${s.notes ? `\nNota: ${s.notes}\n` : ''}
Tu comisión es el ${advisor.commissionRate ?? 25} % de la ganancia neta de cada pedido, y se paga cuando el pedido fue entregado y Dropi ya pagó.
Puedes ver tu estado de cuenta cuando quieras en tu portal de asesor.

¡Gracias por vender con Zavela Store!`;
}
