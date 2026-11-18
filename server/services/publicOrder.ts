/**
 * Vista pública de un pedido (seguimiento sin sesión): solo lo necesario para ver el estado,
 * sin dirección, correo ni teléfono completos. El administrador sigue viendo todo.
 */
import type { Request } from 'express';

const digits = (s: any) => String(s ?? '').replace(/\D/g, '');

export function maskName(name: any): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function maskPhoneTail(p: any): string {
  const d = digits(p);
  return d.length >= 4 ? `******${d.slice(-4)}` : '';
}

export function publicOrderView(o: any): any {
  if (!o) return o;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    dropi_guia: o.dropi_guia,
    paymentMethod: o.paymentMethod,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    total: o.total,
    totalAmount: o.totalAmount,
    city: o.city,
    department: o.department,
    customerName: maskName(o.customerName),
    customerPhone: maskPhoneTail(o.customerPhone),
    items: Array.isArray(o.items)
      ? o.items.map((it: any) => ({
          productId: it.productId, name: it.name || it.title, title: it.title || it.name,
          quantity: it.quantity, price: it.price, image: it.image, variantName: it.variantName, color: it.color, size: it.size
        }))
      : []
  };
}

/** Coincidencia exacta con lo que escribió el visitante (sin búsquedas parciales). */
export function exactMatch(o: any, query: string): boolean {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 6) return false;
  const qd = digits(q);
  const same = (v: any) => String(v ?? '').trim().toLowerCase() === q;
  if (qd.length >= 10 && qd === digits(o.id)) return true; // id sin el prefijo "ord-"
  if (same(o.id) || same(o.orderNumber) || same(o.trackingNumber) || same(o.dropi_guia) || same(o.customerEmail)) return true;
  // Teléfono completo (10 dígitos o más), comparando los últimos 10.
  return qd.length >= 10 && digits(o.customerPhone).slice(-10) === qd.slice(-10);
}

/** IP del visitante usando la última dirección que añade el proxy (la del primer salto no es confiable). */
export function clientIp(req: Request): string {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  return xff.length ? xff[xff.length - 1] : (req.socket.remoteAddress || 'x');
}

const hitMap = new Map<string, number[]>();
/** Devuelve true si la IP superó `max` consultas en `windowMs`. */
export function tooManyHits(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hitMap.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hitMap.set(key, arr);
  if (hitMap.size > 5000) hitMap.clear();
  return arr.length > max;
}
