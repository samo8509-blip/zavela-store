import { OrderStatus } from '../types/index.ts';

export function formatCOP(amount: number, suffix: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return suffix ? '0 COP' : 'COP 0';
  }
  const cleanNumber = Math.round(Number(amount));
  const formatted = cleanNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return suffix ? `${formatted} COP` : `COP ${formatted}`;
}

export function formatCOPFull(amount: number): string {
  return formatCOP(amount, true);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return dateString;
  }
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const ORDER_STATUS_MAP: Record<OrderStatus, StatusConfig> = {
  PENDIENTE_REVISION: {
    label: 'Pendiente Revisión',
    color: 'text-amber-800',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    description: 'Pedido listo para revisión del administrador antes de enviar a Dropi Colombia.'
  },
  APROBADO_DROPI: {
    label: 'Aprobado en Dropi',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-400',
    description: 'Orden enviada exitosamente a Dropi con número de orden y guía logística asignada.'
  },
  ERROR_DROPI: {
    label: 'Error en Dropi',
    color: 'text-rose-800',
    bgColor: 'bg-rose-100',
    borderColor: 'border-rose-300',
    description: 'Rechazado por Dropi (ej. falta de stock, dirección o ID). Requiere corrección y reintento.'
  },
  CANCELADO: {
    label: 'Cancelado',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
    description: 'Pedido cancelado o anulado.'
  },
  pendiente: {
    label: 'Pendiente Revisión',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Pedido registrado. Pendiente de revisión o despacho.'
  },
  pending_cod_confirmation: {
    label: 'Pendiente Confirmación COD',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Pedido contra entrega registrado. Pendiente de contacto con el cliente.'
  },
  confirmed: {
    label: 'Confirmado para Despacho',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Datos verificados con el comprador. Listo para empaque.'
  },
  pago_confirmado: {
    label: 'Pago Confirmado',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Pago validado. Listo para despacho.'
  },
  procesando: {
    label: 'En Preparación / Empaque',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Alistando el paquete en bodega y control de calidad.'
  },
  enviado: {
    label: 'En Camino / Con Guía',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    description: 'Entregado a la transportadora (Servientrega, Coordinadora, etc.) en ruta.'
  },
  shipped: {
    label: 'En Ruta Nacional',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    description: 'Paquete despachado con número de guía activo.'
  },
  entregado: {
    label: 'Entregado',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    description: 'Paquete entregado satisfactoriamente al cliente.'
  },
  delivered: {
    label: 'Entregado y Recaudado',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    description: 'Entrega finalizada y dinero en efectivo recaudado.'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Pedido cancelado por el cliente o inconsistencia en los datos.'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Pedido anulado.'
  }
};
