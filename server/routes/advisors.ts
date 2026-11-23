import { Router } from 'express';
import { db } from '../db.ts';
import * as store from '../services/advisorStore.ts';

const router = Router();

/**
 * GET /api/advisors  (público: lo usa el botón flotante de WhatsApp)
 * Solo expone lo necesario de los asesores activos (nombre, teléfono, canal, si están conectados).
 * Si quien llama es el administrador (token válido) recibe además el resto de campos, sin clave.
 */
router.get('/', (req, res) => {
  const isAdmin = Boolean((res.locals as any).isAdmin);
  const all = store.listAdvisors();
  const activeAdvisors = all
    .filter(a => a.status === 'active' && store.isSalesAdvisor(a))
    .map(a => ({ id: a.id, name: a.name, phone: a.phone, channel: a.channel, status: a.status, available: store.isOnline(a) }));
  res.json({
    success: true,
    source: 'mysql',
    count: isAdmin ? all.length : activeAdvisors.length,
    data: { advisors: isAdmin ? all.map(store.publicAdvisor) : activeAdvisors, activeAdvisors }
  });
});

/**
 * GET /api/advisors/next  (público)
 * Entrega el siguiente asesor CONECTADO (reparto rotativo). Si nadie está conectado devuelve advisor:null
 * y el cliente debe ser atendido por el canal general de la tienda.
 */
router.get('/next', (_req, res) => {
  const a = store.pickNextAvailable();
  if (!a) return res.json({ success: true, advisor: null });
  const phone = (a.phone || '').replace(/\D/g, '');
  res.json({
    success: true,
    advisor: { id: a.id, name: a.name, phone, sellerCode: a.sellerCode, whatsappUrl: `https://wa.me/${phone.startsWith('57') ? phone : '57' + phone}` }
  });
});

/** POST /api/advisors (administrador): crea o actualiza un asesor. */
router.post('/', (req, res) => {
  try {
    const b = req.body || {};
    const saved = store.saveAdvisor({
      id: b.id, name: b.name || b.nombre, phone: b.phone || b.telefono || b.whatsapp,
      role: b.role || b.rol, status: b.status !== undefined ? b.status : (b.activo === 0 || b.activo === false ? 'inactive' : 'active'),
      username: b.username, password: b.password, email: b.email, channel: b.channel, commissionRate: b.commissionRate, notes: b.notes
    } as any);
    db.addLog({ type: 'SETTINGS_UPDATE', action: 'Asesor guardado', details: `Asesor "${saved.name}" (${saved.id}) guardado.`, status: 'success' });
    res.status(201).json({ success: true, message: 'Asesor guardado', data: store.publicAdvisor(saved) });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err?.message || 'Error guardando asesor' });
  }
});

/** DELETE /api/advisors/:id (administrador) */
router.delete('/:id', (req, res) => {
  const ok = store.deleteAdvisors([req.params.id]) > 0;
  if (!ok) return res.status(404).json({ success: false, message: 'Asesor no encontrado' });
  res.json({ success: true, message: 'Asesor eliminado correctamente' });
});

export default router;
