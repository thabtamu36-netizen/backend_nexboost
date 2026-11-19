
import { Router } from 'express';
import { z } from 'zod';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import {
  createPaymentSubmission,
  notifyTelegramAdmins,
  updatePaymentDecision
} from '../lib/management.js';
import { verifyTelegramInitData } from '../lib/telegramAuth.js';

export const paymentsRouter = Router();

const paymentSubmitSchema = z.object({
  plan: z.string().min(1),
  amount: z.coerce.number().min(1),
  paymentMethod: z.string().min(1),
  transactionRef: z.string().min(3),
  paymentProof: z.string().url().optional().nullable()
});

const paymentDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected'])
});

paymentsRouter.post('/submit', async (req, res) => {
  const authHeader = req.header('authorization') ?? '';

  if (!authHeader.startsWith('tma ')) {
    return res.status(401).json({
      ok: false,
      error: 'Telegram authentication is required. Reopen NEXBOOST from Telegram.'
    });
  }

  let telegramUser;

  try {
    const initData = authHeader.slice(4);
    telegramUser = verifyTelegramInitData(initData);
  } catch (error) {
    return res.status(401).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Telegram authentication failed.'
    });
  }

  const parsed = paymentSubmitSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payment submission payload.'
    });
  }

  try {
    const result = await createPaymentSubmission({
      telegramId: telegramUser.id,
      username: telegramUser.username ?? null,
      firstName: telegramUser.first_name ?? null,
      lastName: telegramUser.last_name ?? null,
      plan: parsed.data.plan,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      transactionRef: parsed.data.transactionRef,
      paymentProof: parsed.data.paymentProof ?? null
    });

    if (!result.duplicate) {
      await notifyTelegramAdmins(
        `New payment submitted by @${telegramUser.username ?? 'customer'} for ${parsed.data.plan}.\nAmount: ${parsed.data.amount} ETB\nMethod: ${parsed.data.paymentMethod}\nReference: ${parsed.data.transactionRef}`
      );
    }

    return res.json({
      ok: true,
      payment: result.payment,
      user: result.user,
      duplicate: result.duplicate
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Unable to submit payment.'
    });
  }
});

paymentsRouter.post('/:id/decision', requireAdminAuth, async (req, res) => {
  const parsed = paymentDecisionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payment decision payload.'
    });
  }

  try {
    const adminRequest = req as typeof req & {
      admin?: { username?: string };
    };

    const paymentId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const result = await updatePaymentDecision(
      paymentId,
      parsed.data.decision,
      adminRequest.admin?.username ?? 'admin'
    );

    return res.json({
      ok: true,
      payment: result.payment,
      user: result.user
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error
        ? error.message
        : 'Failed to update payment decision.'
    });
  }
});
