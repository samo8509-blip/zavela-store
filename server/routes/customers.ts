import { Router } from 'express';
import { db } from '../db.ts';
import { cpanelDbService } from '../services/cpanelDbService.ts';

const router = Router();

/**
 * GET /api/customers
 * Retorna los clientes registrados desde la base de datos MySQL en cPanel
 * con fallback transparente a la base de datos local en memoria.
 */
router.get('/', async (req, res) => {
  try {
    // 1. Intento de consulta en cPanel MySQL (http://api.zavelastore.com.co/api.php?action=clientes)
    const remoteCustomers = await cpanelDbService.fetchCustomers();
    if (remoteCustomers && remoteCustomers.length > 0) {
      return res.json({
        success: true,
        source: 'cpanel',
        count: remoteCustomers.length,
        data: remoteCustomers
      });
    }

    // 2. Fallback a clientes en memoria local (excluyendo pruebas internas)
    const local = db.getCustomers()
      .filter(c => {
        const id = String(c.id || '');
        const email = String(c.email || '').toLowerCase();
        const name = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase();
        if (id.startsWith('cust-1791074237240') || id.startsWith('cust-1791219139667')) return false;
        if (email === 'valentina@gmail.com' || email === 'carlos@gmail.com') return false;
        if (name.includes('prueba') || name.includes('test')) return false;
        return true;
      })
      .map(c => ({
      id: c.id,
      nombre: `${c.firstName} ${c.lastName || ''}`.trim(),
      name: `${c.firstName} ${c.lastName || ''}`.trim(),
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || '',
      telefono: c.phone || '',
      phone: c.phone || '',
      direccion: c.address || '',
      address: c.address || '',
      ciudad: c.city || '',
      city: c.city || '',
      departamento: c.department || '',
      createdAt: c.createdAt || new Date().toISOString(),
      created_at: c.createdAt || new Date().toISOString()
    }));

    res.json({
      success: true,
      source: 'local_fallback',
      count: local.length,
      data: local
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Error consultando clientes' });
  }
});

/**
 * DELETE /api/customers/clear-all
 * Elimina todos los clientes registrados de prueba
 */
router.delete('/clear-all', (req, res) => {
  try {
    db.clearAllCustomers();
    res.json({ success: true, message: 'Clientes de prueba eliminados correctamente' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Error eliminando clientes' });
  }
});

/**
 * POST /api/customers
 * Registra un nuevo cliente tanto en memoria local como en MySQL cPanel vía POST action=clientes
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.nombre || body.name || `${body.firstName || ''} ${body.lastName || ''}`.trim() || 'Cliente';
    const email = body.email || '';
    const phone = body.telefono || body.phone || '';
    const address = body.direccion || body.address || '';
    const city = body.ciudad || body.city || 'Bogotá D.C.';
    const department = body.departamento || body.department || 'Cundinamarca';

    const nameParts = name.split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '';

    // 1. Guardar en BD local para garantizar disponibilidad inmediata
    const savedCustomer = db.saveCustomer({
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      department,
      notes: body.notes || 'Registrado desde portal web',
      totalOrders: 0,
      totalSpent: 0
    });

    // 2. Sincronizar de inmediato con MySQL cPanel (http://api.zavelastore.com.co/api.php?action=clientes)
    let cpanelResult = null;
    try {
      cpanelResult = await cpanelDbService.createCustomer({
        nombre: name,
        name,
        firstName,
        lastName,
        email,
        telefono: phone,
        phone,
        direccion: address,
        address,
        ciudad: city,
        city,
        departamento: department,
        department
      });
    } catch (cpanelErr: any) {
      console.warn('[cPanel Customer Sync] Warning sincronizando con cPanel:', cpanelErr?.message || cpanelErr);
    }

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: {
        id: cpanelResult?.id || savedCustomer.id,
        nombre: name,
        email,
        telefono: phone,
        direccion: address,
        ciudad: city,
        departamento: department,
        created_at: new Date().toISOString()
      },
      cpanelSync: Boolean(cpanelResult)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Error registrando cliente' });
  }
});

export default router;
