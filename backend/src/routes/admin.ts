import { Router } from 'express';
import { z } from 'zod';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { getDashboardSnapshot, notifyTelegramAdmins } from '../lib/management.js';

export const adminRouter = Router();

adminRouter.use(requireAdminAuth);

const adminActionSchema = z.object({
  action: z.enum(['refresh', 'notify'])
});

adminRouter.get('/dashboard', (_req, res) => {
  return res.json(getDashboardSnapshot());
});

adminRouter.post('/action', (req, res) => {
  const parsed = adminActionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid admin action payload.' });
  }

  if (parsed.data.action === 'notify') {
    void notifyTelegramAdmins('NEXBOOST admin dashboard refreshed successfully.');
    return res.json({ ok: true, message: 'Admin notification queued.' });
  }

  return res.json({ ok: true, message: 'Dashboard refresh triggered.' });
});
