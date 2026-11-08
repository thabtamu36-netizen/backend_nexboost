import { Router } from 'express';
import { z } from 'zod';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import {
  createPaymentSubmission,
  notifyTelegramAdmins,
  updatePaymentDecision
} from '../lib/management.js';

export const paymentsRouter = Router();

const paymentSubmitSchema = z.object({
  telegramId: z.coerce.number().int().positive(),
  username: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
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
  const parsed = paymentSubmitSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payment submission payload.'
    });
  }

  try {
    const result = await createPaymentSubmission({
      telegramId: parsed.data.telegramId,
      username: parsed.data.username ?? null,
      firstName: parsed.data.firstName ?? null,
      lastName: parsed.data.lastName ?? null,
      plan: parsed.data.plan,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      transactionRef: parsed.data.transactionRef,
      paymentProof: parsed.data.paymentProof ?? null
    });

    await notifyTelegramAdmins(
      `New payment submitted by @${parsed.data.username ?? 'customer'} for ${parsed.data.plan}.\nAmount: ${parsed.data.amount} ETB\nMethod: ${parsed.data.paymentMethod}\nReference: ${parsed.data.transactionRef}`
    );

    return res.json({
      ok: true,
      payment: result.payment,
      user: result.user,
      duplicate: result.duplicate
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to submit payment.'
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
    const result = await updatePaymentDecision(req.params.id, parsed.data.decision, req.admin?.username ?? 'admin');

    return res.json({
      ok: true,
      payment: result.payment,
      user: result.user
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to update payment decision.'
    });
  }
});
