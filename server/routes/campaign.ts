import { Router } from 'express';
import { loadCampaign, listCategories, previewCampaign, activateCampaign, endCampaign, previewPlan, activatePlan, DEFAULT_TIERS } from '../services/campaign.ts';

/** Campaña de precios reales. Solo administradores (regla en apiGuard). */
const router = Router();

router.get('/', async (_req, res) => {
  try {
    const state = await loadCampaign();
    res.json({ success: true, state, categories: await listCategories() });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Error' });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const { rows, categoryId } = await previewCampaign({
      categoryContains: String(req.body?.categoryContains || ''),
      maxDiscount: Number(req.body?.maxDiscount),
      minMarginPercent: Number(req.body?.minMarginPercent),
      marginBase: req.body?.marginBase === 'costo' ? 'costo' : 'venta'
    });
    res.json({ success: true, rows, categoryId });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Error' });
  }
});

router.post('/activate', async (req, res) => {
  try {
    const state = await activateCampaign({
      productIds: Array.isArray(req.body?.productIds) ? req.body.productIds : [],
      categoryContains: String(req.body?.categoryContains || ''),
      maxDiscount: Number(req.body?.maxDiscount),
      minMarginPercent: Number(req.body?.minMarginPercent),
      marginBase: req.body?.marginBase === 'costo' ? 'costo' : 'venta',
      endsAt: String(req.body?.endsAt || ''),
      name: req.body?.name,
      homeBlocks: req.body?.homeBlocks !== false
    });
    res.json({ success: true, state });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e?.message || 'No se pudo activar' });
  }
});

router.get('/plan-defaults', (_req, res) => res.json({ success: true, tiers: DEFAULT_TIERS }));

router.post('/plan-preview', async (req, res) => {
  try {
    const rows = await previewPlan({
      tiers: req.body?.tiers,
      minMarginPercent: Number(req.body?.minMarginPercent),
      marginBase: req.body?.marginBase === 'costo' ? 'costo' : 'venta'
    });
    res.json({ success: true, rows });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'Error' });
  }
});

router.post('/plan-activate', async (req, res) => {
  try {
    const state = await activatePlan({
      productIds: Array.isArray(req.body?.productIds) ? req.body.productIds : [],
      tiers: req.body?.tiers,
      minMarginPercent: Number(req.body?.minMarginPercent),
      marginBase: req.body?.marginBase === 'costo' ? 'costo' : 'venta',
      endsAt: req.body?.endsAt ? String(req.body.endsAt) : undefined,
      name: req.body?.name,
      homeBlocks: req.body?.homeBlocks !== false
    });
    res.json({ success: true, state });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e?.message || 'No se pudo activar' });
  }
});

router.post('/end', async (_req, res) => {
  try {
    const state = await endCampaign('manual');
    res.json({ success: true, state });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e?.message || 'No se pudo terminar' });
  }
});

export default router;
