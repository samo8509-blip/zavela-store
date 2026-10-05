import { Router } from 'express';
import { db } from '../db.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

/**
 * GET /api/advisors
 * Retorna los asesores activos consultados desde MySQL cPanel vía GET action=asesores
 * con fallback local transparente.
 */
router.get('/', async (req, res) => {
  try {
    // 1. Consulta directa a MySQL cPanel
    const remote = await cpanelDbService.fetchAdvisors();
    if (remote && remote.length > 0) {
      const activeAdvisors = remote.filter(a => a.activo === 1 || a.status === 'active');
      return res.json({
        success: true,
        source: 'cpanel',
        count: remote.length,
        data: {
          advisors: remote,
          activeAdvisors: activeAdvisors.length > 0 ? activeAdvisors : remote
        }
      });
    }

    // 2. Fallback a la base local en memoria
    const localAdvisors = db.getAdvisors();
    const activeLocal = localAdvisors.filter(a => a.status === 'active' && a.role !== 'admin');

    res.json({
      success: true,
      source: 'local_fallback',
      count: localAdvisors.length,
      data: {
        advisors: localAdvisors,
        activeAdvisors: activeLocal.length > 0 ? activeLocal : localAdvisors
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Error consultando asesores' });
  }
});

/**
 * POST /api/advisors
 * Registra o actualiza un asesor en cPanel MySQL (action=asesores) y en la base local.
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const nombre = body.nombre || body.name || 'Asesor Zavela';
    const telefono = body.telefono || body.whatsapp || body.phone || '';
    const rol = body.rol || body.role || 'Asesor de Ventas';
    const activo = body.activo !== undefined ? (body.activo ? 1 : 0) : 1;

    // Guardar en cPanel
    const cpanelRes = await cpanelDbService.saveAdvisor({
      id: body.id,
      nombre,
      name: nombre,
      telefono,
      whatsapp: telefono,
      phone: telefono,
      rol,
      role: rol,
      activo
    });

    // Guardar en BD local
    const savedLocal = db.saveAdvisor({
      id: cpanelRes?.id || body.id || `adv-${Date.now()}`,
      name: nombre,
      phone: telefono,
      role: rol.toLowerCase().includes('admin') ? 'admin' : 'advisor',
      channel: 'WhatsApp Directo',
      status: activo ? 'active' : 'inactive'
    });

    res.status(201).json({
      success: true,
      message: 'Asesor guardado exitosamente en cPanel y base local',
      data: savedLocal,
      cpanelSync: Boolean(cpanelRes)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Error guardando asesor' });
  }
});

/**
 * DELETE /api/advisors/:id
 * Elimina un asesor en cPanel MySQL (DELETE action=asesores&id=...) y en la base local.
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    db.deleteAdvisor(id);

    let cpanelDeleted = null;
    try {
      cpanelDeleted = await cpanelDbService.deleteAdvisor(id);
    } catch (e: any) {
      console.warn('[cPanel Delete Advisor Warning]:', e);
    }

    res.json({
      success: true,
      message: 'Asesor eliminado correctamente',
      cpanelSync: Boolean(cpanelDeleted)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Error eliminando asesor' });
  }
});

export default router;
