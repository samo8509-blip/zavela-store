/**
 * Asesores: lista única y persistente en MySQL (tabla `zavela_asesores`).
 * - Cache en memoria para lecturas síncronas; cada cambio se guarda en MySQL.
 * - Si no hay MySQL (desarrollo local) se guarda en `.advisors.json` (fuera de git).
 * - Las claves se guardan cifradas (scrypt); nunca se devuelven al navegador.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Advisor } from '../../src/types/index.ts';

const FILE = path.join(process.cwd(), '.advisors.json');
const ONLINE_WINDOW_MS = 3 * 60 * 1000; // sin señal de vida en 3 min => desconectado
let cache: Advisor[] = [];
let mysqlOk = false;

const getPool = async () => (await import('../mysqlPool.ts')).nativePool;

export const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(plain, salt, 32).toString('hex')}`;
};
const isHash = (v?: string) => typeof v === 'string' && v.startsWith('scrypt$');
export const verifyPassword = (plain: string, stored?: string): boolean => {
  if (!stored || !plain) return false;
  if (!isHash(stored)) return false; // nunca se aceptan claves en texto plano
  const [, salt, hash] = stored.split('$');
  const test = crypto.scryptSync(plain, salt, 32);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
};

const toRow = (a: Advisor) => [
  a.id, a.name, a.sellerCode || null, a.username || null, a.password || null, a.phone || null, a.email || null,
  a.channel || null, a.commissionRate ?? 25, a.status === 'active' ? 1 : 0, a.available ? 1 : 0,
  a.lastSeen ? new Date(a.lastSeen) : null, a.lastAssignedAt ? new Date(a.lastAssignedAt) : null,
  a.notes || null, a.settlementStatus || 'al_dia', a.lastSettlementDate ? new Date(a.lastSettlementDate) : null,
  a.role || 'advisor', a.createdAt ? new Date(a.createdAt) : new Date(),
  a.payoutCycle === 'mensual' ? 'mensual' : 'quincenal', Number(a.payoutDelayDays ?? 3), Math.max(0, Math.round(Number(a.monthlyGoal || 0)))
];
const fromRow = (r: any): Advisor => ({
  id: r.id, name: r.nombre, sellerCode: r.codigo || undefined, username: r.usuario || undefined,
  password: r.clave_hash || undefined, phone: r.telefono || undefined, email: r.email || undefined,
  channel: r.canal || 'WhatsApp Directo', commissionRate: Number(r.comision_pct ?? 25),
  status: r.activo ? 'active' : 'inactive', available: !!r.disponible,
  lastSeen: r.ultima_senal ? new Date(r.ultima_senal).toISOString() : undefined,
  lastAssignedAt: r.ultima_asignacion ? new Date(r.ultima_asignacion).toISOString() : undefined,
  notes: r.notas || '', settlementStatus: r.liquidacion || 'al_dia',
  lastSettlementDate: r.fecha_liquidacion ? new Date(r.fecha_liquidacion).toISOString() : undefined,
  role: r.rol === 'admin' ? 'admin' : 'advisor',
  payoutCycle: r.ciclo === 'mensual' ? 'mensual' : 'quincenal', payoutDelayDays: Number(r.dias_pago ?? 3), monthlyGoal: Number(r.meta_mensual ?? 0),
  createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
});

export async function loadAdvisors(): Promise<void> {
  try {
    const p = await getPool();
    if (p) {
      await p.query(`CREATE TABLE IF NOT EXISTS zavela_asesores (
        id VARCHAR(64) NOT NULL PRIMARY KEY, nombre VARCHAR(255) NOT NULL, codigo VARCHAR(32) NULL,
        usuario VARCHAR(100) NULL, clave_hash VARCHAR(255) NULL, telefono VARCHAR(40) NULL, email VARCHAR(255) NULL,
        canal VARCHAR(100) NULL, comision_pct DECIMAL(5,2) NOT NULL DEFAULT 25, activo TINYINT(1) NOT NULL DEFAULT 1,
        disponible TINYINT(1) NOT NULL DEFAULT 0, ultima_senal DATETIME NULL, ultima_asignacion DATETIME NULL,
        notas TEXT NULL, liquidacion VARCHAR(32) NOT NULL DEFAULT 'al_dia', fecha_liquidacion DATETIME NULL,
        rol VARCHAR(16) NOT NULL DEFAULT 'advisor', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_usuario (usuario), UNIQUE KEY uq_codigo (codigo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      // Columnas agregadas después (se ignora el error si ya existen)
      for (const ddl of ["ALTER TABLE zavela_asesores ADD COLUMN ciclo VARCHAR(12) NOT NULL DEFAULT 'quincenal'", "ALTER TABLE zavela_asesores ADD COLUMN dias_pago INT NOT NULL DEFAULT 3", "ALTER TABLE zavela_asesores ADD COLUMN meta_mensual BIGINT NOT NULL DEFAULT 0"]) {
        try { await p.query(ddl); } catch {}
      }
      const [rows]: any = await p.query('SELECT * FROM zavela_asesores ORDER BY created_at');
      cache = (rows || []).map(fromRow);
      mysqlOk = true;
      return;
    }
  } catch (e: any) {
    console.warn('[Asesores] No se pudo usar MySQL:', e?.message);
  }
  try { cache = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { cache = []; }
}

async function persist(a: Advisor): Promise<void> {
  if (mysqlOk) {
    try {
      const p = await getPool();
      await p!.query(`INSERT INTO zavela_asesores (id,nombre,codigo,usuario,clave_hash,telefono,email,canal,comision_pct,activo,disponible,ultima_senal,ultima_asignacion,notas,liquidacion,fecha_liquidacion,rol,created_at,ciclo,dias_pago,meta_mensual)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE nombre=VALUES(nombre),codigo=VALUES(codigo),usuario=VALUES(usuario),clave_hash=VALUES(clave_hash),
        telefono=VALUES(telefono),email=VALUES(email),canal=VALUES(canal),comision_pct=VALUES(comision_pct),activo=VALUES(activo),
        disponible=VALUES(disponible),ultima_senal=VALUES(ultima_senal),ultima_asignacion=VALUES(ultima_asignacion),notas=VALUES(notas),
        liquidacion=VALUES(liquidacion),fecha_liquidacion=VALUES(fecha_liquidacion),rol=VALUES(rol),ciclo=VALUES(ciclo),dias_pago=VALUES(dias_pago),meta_mensual=VALUES(meta_mensual)`, toRow(a));
    } catch (e: any) { console.warn('[Asesores] No se pudo guardar en MySQL:', e?.message); }
    return;
  }
  try { fs.writeFileSync(FILE, JSON.stringify(cache, null, 2), { mode: 0o600 }); } catch {}
}
async function removeFromDb(ids: string[]): Promise<void> {
  if (mysqlOk) {
    try { const p = await getPool(); await p!.query('DELETE FROM zavela_asesores WHERE id IN (?)', [ids]); }
    catch (e: any) { console.warn('[Asesores] No se pudo borrar en MySQL:', e?.message); }
    return;
  }
  try { fs.writeFileSync(FILE, JSON.stringify(cache, null, 2), { mode: 0o600 }); } catch {}
}

export const listAdvisors = (): Advisor[] => cache;
export const getAdvisor = (id: string) => cache.find(a => a.id === id);

/** Versión segura para enviar al navegador (sin clave). */
export const publicAdvisor = (a: Advisor): Advisor => {
  const { password, ...rest } = a;
  return { ...rest, available: isOnline(a) } as Advisor;
};
export const isOnline = (a: Advisor) =>
  a.status === 'active' && !!a.available && !!a.lastSeen && Date.now() - new Date(a.lastSeen).getTime() < ONLINE_WINDOW_MS;

function nextSellerCode(): string {
  const max = cache.reduce((m, a) => Math.max(m, Number(/^VEN-(\d+)$/.exec(a.sellerCode || '')?.[1] || 0)), 0);
  return `VEN-${String(max + 1).padStart(3, '0')}`;
}

export function saveAdvisor(input: Partial<Advisor>): Advisor {
  const existing = input.id ? getAdvisor(input.id) : undefined;
  const emailIn = (input.email ?? existing?.email ?? '').toString().trim().toLowerCase();
  if (emailIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailIn)) throw new Error('El correo no es válido.');
  const username = ((input.username ?? existing?.username ?? '').trim() || emailIn) || undefined;
  if (username && cache.some(a => a.id !== existing?.id && (a.username || '').toLowerCase() === username.toLowerCase())) {
    throw new Error(`El usuario "${username}" ya existe.`);
  }
  const wantedCode = (input.sellerCode || '').trim().toUpperCase();
  if (wantedCode && cache.some(x => x.id !== existing?.id && (x.sellerCode || '').toUpperCase() === wantedCode)) {
    throw new Error(`El código de vendedor ${wantedCode} ya lo tiene otro asesor.`);
  }
  let password = existing?.password;
  if (typeof input.password === 'string' && input.password.trim()) {
    if (input.password.trim().length < 6) throw new Error('La clave debe tener al menos 6 caracteres.');
    password = isHash(input.password) ? input.password : hashPassword(input.password.trim());
  }
  const merged: Advisor = {
    id: existing?.id || input.id || `AS-${Date.now().toString(36).toUpperCase()}`,
    name: (input.name ?? existing?.name ?? 'Asesor').toString().trim() || 'Asesor',
    role: input.role === 'admin' ? 'admin' : (existing?.role || 'advisor'),
    sellerCode: wantedCode || existing?.sellerCode || nextSellerCode(),
    username, password,
    phone: (input.phone ?? existing?.phone ?? '').toString().replace(/[^\d+]/g, ''),
    email: emailIn,
    channel: input.channel ?? existing?.channel ?? 'WhatsApp Directo',
    commissionRate: Math.min(100, Math.max(0, Number(input.commissionRate ?? existing?.commissionRate ?? 25))),
    status: (input.status ?? existing?.status ?? 'active') === 'inactive' ? 'inactive' : 'active',
    available: input.available ?? existing?.available ?? false,
    lastSeen: input.lastSeen ?? existing?.lastSeen,
    lastAssignedAt: input.lastAssignedAt ?? existing?.lastAssignedAt,
    settlementStatus: input.settlementStatus ?? existing?.settlementStatus ?? 'al_dia',
    lastSettlementDate: input.lastSettlementDate ?? existing?.lastSettlementDate,
    notes: input.notes ?? existing?.notes ?? '',
    payoutCycle: (input.payoutCycle ?? existing?.payoutCycle ?? 'quincenal') === 'mensual' ? 'mensual' : 'quincenal',
    payoutDelayDays: Math.min(30, Math.max(0, Number(input.payoutDelayDays ?? existing?.payoutDelayDays ?? 3))),
    monthlyGoal: Math.max(0, Math.round(Number(input.monthlyGoal ?? existing?.monthlyGoal ?? 0))),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  if (merged.status === 'inactive') merged.available = false;
  if (existing) cache[cache.indexOf(existing)] = merged; else cache.push(merged);
  void persist(merged);
  return merged;
}

export function deleteAdvisors(ids: string[]): number {
  const before = cache.length;
  cache = cache.filter(a => !ids.includes(a.id));
  const n = before - cache.length;
  if (n) void removeFromDb(ids);
  return n;
}

export function authenticate(identifier: string, password: string): Advisor | null {
  const id = (identifier || '').trim().toLowerCase();
  const a = cache.find(x => [x.username, x.id, x.sellerCode, x.email].some(v => (v || '').toLowerCase() === id));
  if (!a || a.status !== 'active' || !verifyPassword(password, a.password)) return null;
  return a;
}

/** Señal de vida del portal + interruptor "Disponible". */
export function setPresence(id: string, available?: boolean): Advisor | null {
  const a = getAdvisor(id);
  if (!a) return null;
  a.lastSeen = new Date().toISOString();
  if (typeof available === 'boolean') a.available = available && a.status === 'active';
  void persist(a);
  return a;
}

/** Siguiente asesor conectado (reparto rotativo: el que lleva más tiempo sin recibir un cliente). */
export function pickNextAvailable(): Advisor | null {
  const online = cache.filter(a => a.role !== 'admin' && isOnline(a) && a.phone);
  if (!online.length) return null;
  online.sort((x, y) => new Date(x.lastAssignedAt || 0).getTime() - new Date(y.lastAssignedAt || 0).getTime());
  const a = online[0];
  a.lastAssignedAt = new Date().toISOString();
  void persist(a);
  return a;
}

export const findByEmail = (email: string) => {
  const e = (email || '').trim().toLowerCase();
  return e ? cache.find(a => a.status === 'active' && (a.email || '').toLowerCase() === e) : undefined;
};
/** Huella de la clave actual: el enlace de recuperación deja de servir apenas la clave cambia. */
export const passwordFingerprint = (a: Advisor) => crypto.createHash('sha256').update(a.password || 'sin-clave').digest('hex').slice(0, 16);
