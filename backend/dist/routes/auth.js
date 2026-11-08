import { Router } from 'express';
import { z } from 'zod';
import { requireTelegramAuth } from '../middleware/telegramAuth.js';
export const authRouter = Router();
const authSchema = z.object({
    authType: z.enum(['telegram', 'admin'])
});
authRouter.post('/verify', requireTelegramAuth, (req, res) => {
    const { telegramUser } = req;
    if (!telegramUser) {
        return res.status(401).json({ error: 'Telegram user not found' });
    }
    res.json({
        ok: true,
        user: {
            id: telegramUser.id,
            username: telegramUser.username,
            verified: true,
            authType: 'telegram'
        }
    });
});
authRouter.post('/login', (req, res) => {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid auth payload' });
    }
    res.json({
        ok: true,
        authType: parsed.data.authType,
        message: 'Authentication request accepted. Install Supabase and Telegram credentials to continue.'
    });
});
