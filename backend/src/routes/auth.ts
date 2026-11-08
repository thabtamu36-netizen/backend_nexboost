import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { activateTrialForUser } from '../lib/management.js';
import { requireTelegramAuth } from '../middleware/telegramAuth.js';

export const authRouter = Router();

const authSchema = z.object({
  authType: z.enum(['telegram', 'admin'])
});

const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

authRouter.post('/trial', requireTelegramAuth, async (req, res) => {
  const { telegramUser } = req as typeof req & { telegramUser?: { id: number; username?: string; first_name?: string; last_name?: string } };

  if (!telegramUser) {
    return res.status(401).json({ error: 'Telegram user not found' });
  }

  const payload = await activateTrialForUser({
    telegramId: telegramUser.id,
    username: telegramUser.username ?? null,
    firstName: telegramUser.first_name ?? null,
    lastName: telegramUser.last_name ?? null
  });

  return res.json({
    ok: true,
    message: 'Free trial activated successfully.',
    trial: payload.trial
  });
});

authRouter.post('/login', (req, res) => {
  const parsed = authSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid auth payload' });
  }

  if (parsed.data.authType === 'admin') {
    return res.json({
      ok: true,
      authType: 'admin',
      token: env.ADMIN_SESSION_SECRET,
      message: 'Admin authentication accepted.'
    });
  }

  res.json({
    ok: true,
    authType: parsed.data.authType,
    message: 'Telegram authentication request accepted.'
  });
});

authRouter.post('/admin/login', (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Invalid admin credentials payload.' });
  }

  if (parsed.data.username !== env.ADMIN_USERNAME || parsed.data.password !== env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Invalid admin username or password.' });
  }

  return res.json({
    ok: true,
    token: env.ADMIN_SESSION_SECRET,
    user: {
      username: env.ADMIN_USERNAME,
      role: 'superadmin'
    }
  });
});
