import { randomUUID } from 'node:crypto';
import { env, getAdminChatIds, isSupabaseReady } from '../config/env.js';
import { getSupabase } from './supabase.js';

export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'inactive';

export type UserRecord = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  account_status: 'active' | 'blocked';
  created_at: string;
  updated_at: string;
};

export type PaymentRecord = {
  id: string;
  user_id: string;
  amount: number;
  payment_proof: string | null;
  payment_method: string;
  submitted_at: string;
  status: PaymentStatus;
  approved_by?: string | null;
  decision_note?: string | null;
};

export type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan: string;
  start_date: string;
  expiry_date: string;
  status: SubscriptionStatus;
};

export type ActivityLogRecord = {
  id: string;
  user_id: string;
  admin_id: string | null;
  action: string;
  details: string;
  created_at: string;
};

const state = {
  users: [] as UserRecord[],
  payments: [] as PaymentRecord[],
  subscriptions: [] as SubscriptionRecord[],
  activityLogs: [] as ActivityLogRecord[]
};

export async function hydrateStateFromSupabase() {
  if (!isSupabaseReady) {
    return;
  }

  try {
    const supabase = getSupabase();
    const [usersResult, paymentsResult, subscriptionsResult, activityLogsResult] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('subscriptions').select('*'),
      supabase.from('activity_logs').select('*')
    ]);

    if (usersResult.data) {
      state.users = usersResult.data.map((user) => ({
        id: user.id,
        telegram_id: Number(user.telegram_id),
        username: user.username ?? null,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
        account_status: user.account_status,
        created_at: user.created_at,
        updated_at: user.updated_at
      }));
    }

    if (paymentsResult.data) {
      state.payments = paymentsResult.data.map((payment) => ({
        id: payment.id,
        user_id: payment.user_id,
        amount: Number(payment.amount),
        payment_proof: payment.payment_proof ?? null,
        payment_method: payment.payment_method,
        submitted_at: payment.submitted_at,
        status: payment.status,
        approved_by: payment.approved_by ?? null,
        decision_note: payment.decision_note ?? null,
        transaction_ref: payment.transaction_ref
      } as PaymentRecord & { transaction_ref: string }));
    }

    if (subscriptionsResult.data) {
      state.subscriptions = subscriptionsResult.data.map((subscription) => ({
        id: subscription.id,
        user_id: subscription.user_id,
        plan: subscription.plan,
        start_date: subscription.start_date,
        expiry_date: subscription.expiry_date,
        status: subscription.status
      }));
    }

    if (activityLogsResult.data) {
      state.activityLogs = activityLogsResult.data.map((log) => ({
        id: log.id,
        user_id: log.user_id,
        admin_id: log.admin_id ?? null,
        action: log.action,
        details: log.details,
        created_at: log.created_at
      }));
    }
  } catch {
    // Leave in-memory state as-is when the database is unavailable.
  }
}

async function syncUserToSupabase(user: UserRecord) {
  if (!isSupabaseReady) {
    return;
  }

  try {
    const supabase = getSupabase();
    await supabase.from('users').upsert({
      id: user.id,
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      account_status: user.account_status,
      created_at: user.created_at,
      updated_at: user.updated_at
    }, { onConflict: 'telegram_id' });
  } catch {
    // Ignore optional Supabase sync failures so the in-memory flow stays usable.
  }
}

async function syncPaymentToSupabase(payment: PaymentRecord & { transaction_ref: string }) {
  if (!isSupabaseReady) {
    return;
  }

  try {
    const supabase = getSupabase();
    await supabase.from('payments').upsert({
      id: payment.id,
      user_id: payment.user_id,
      amount: payment.amount,
      payment_proof: payment.payment_proof,
      payment_method: payment.payment_method,
      submitted_at: payment.submitted_at,
      status: payment.status,
      approved_by: payment.approved_by,
      decision_note: payment.decision_note,
      transaction_ref: payment.transaction_ref,
      created_at: payment.submitted_at
    }, { onConflict: 'transaction_ref' });
  } catch {
    // Ignore optional Supabase sync failures so the in-memory flow stays usable.
  }
}

async function syncSubscriptionToSupabase(subscription: SubscriptionRecord) {
  if (!isSupabaseReady) {
    return;
  }

  try {
    const supabase = getSupabase();
    await supabase.from('subscriptions').upsert({
      id: subscription.id,
      user_id: subscription.user_id,
      plan: subscription.plan,
      start_date: subscription.start_date,
      expiry_date: subscription.expiry_date,
      status: subscription.status,
      created_at: subscription.start_date,
      updated_at: subscription.start_date
    }, { onConflict: 'id' });
  } catch {
    // Ignore optional Supabase sync failures so the in-memory flow stays usable.
  }
}

async function syncActivityLogToSupabase(log: ActivityLogRecord) {
  if (!isSupabaseReady) {
    return;
  }

  try {
    const supabase = getSupabase();
    await supabase.from('activity_logs').insert({
      id: log.id,
      user_id: log.user_id,
      admin_id: log.admin_id,
      action: log.action,
      details: log.details,
      created_at: log.created_at
    });
  } catch {
    // Ignore optional Supabase sync failures so the in-memory flow stays usable.
  }
}

const ensureSeedData = () => {
  if (state.users.length > 0 || state.payments.length > 0 || state.subscriptions.length > 0) {
    return;
  }

  const userId = randomUUID();
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  state.users.push({
    id: userId,
    telegram_id: 123456789,
    username: 'demo_admin',
    first_name: 'Demo',
    last_name: 'Admin',
    account_status: 'active',
    created_at: now,
    updated_at: now
  });

  state.subscriptions.push({
    id: randomUUID(),
    user_id: userId,
    plan: 'monthly',
    start_date: now,
    expiry_date: future,
    status: 'active'
  });

  state.payments.push({
    id: randomUUID(),
    user_id: userId,
    amount: 349,
    payment_proof: 'https://example.com/proof/demo.jpg',
    payment_method: 'telebirr',
    submitted_at: now,
    status: 'approved',
    approved_by: 'admin-bot',
    decision_note: 'Demo approval'
  });

  state.activityLogs.push({
    id: randomUUID(),
    user_id: userId,
    admin_id: null,
    action: 'dashboard_seeded',
    details: 'Seed data initialized for the management dashboard.',
    created_at: now
  });
};

export function getDashboardSnapshot() {
  ensureSeedData();

  const stats = {
    totalUsers: state.users.length,
    activeSubscriptions: state.subscriptions.filter((s) => s.status === 'active').length,
    pendingPayments: state.payments.filter((p) => p.status === 'pending').length,
    approvedPayments: state.payments.filter((p) => p.status === 'approved').length,
    rejectedPayments: state.payments.filter((p) => p.status === 'rejected').length,
    totalRevenue: state.payments.reduce((sum, payment) => sum + (payment.status === 'approved' ? payment.amount : 0), 0)
  };

  return {
    stats,
    users: state.users,
    payments: state.payments,
    subscriptions: state.subscriptions,
    activityLogs: state.activityLogs,
    realtimeEnabled: isSupabaseReady
  };
}

export function upsertUser(telegramUser: {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  ensureSeedData();

  const existing = state.users.find((user) => user.telegram_id === telegramUser.telegramId);
  if (existing) {
    const updated = {
      ...existing,
      username: telegramUser.username ?? existing.username,
      first_name: telegramUser.firstName ?? existing.first_name,
      last_name: telegramUser.lastName ?? existing.last_name,
      updated_at: new Date().toISOString()
    };

    const index = state.users.findIndex((user) => user.id === existing.id);
    state.users[index] = updated;
    void syncUserToSupabase(updated);
    return updated;
  }

  const user: UserRecord = {
    id: randomUUID(),
    telegram_id: telegramUser.telegramId,
    username: telegramUser.username ?? null,
    first_name: telegramUser.firstName ?? null,
    last_name: telegramUser.lastName ?? null,
    account_status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  state.users.push(user);
  void syncUserToSupabase(user);
  return user;
}

export async function createPaymentSubmission(input: {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  plan: string;
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  paymentProof?: string | null;
}) {
  ensureSeedData();

  const user = upsertUser({
    telegramId: input.telegramId,
    username: input.username,
    firstName: input.firstName,
    lastName: input.lastName
  });

  await syncUserToSupabase(user);

  const existingPending = state.payments.find(
    (payment) => payment.user_id === user.id && payment.status === 'pending' && payment.transaction_ref === input.transactionRef
  );

  if (existingPending) {
    return { ok: true, payment: existingPending, user, duplicate: true };
  }

  const payment: PaymentRecord & { transaction_ref: string } = {
    id: randomUUID(),
    user_id: user.id,
    amount: input.amount,
    payment_proof: input.paymentProof ?? null,
    payment_method: input.paymentMethod,
    submitted_at: new Date().toISOString(),
    status: 'pending',
    approved_by: null,
    decision_note: null,
    transaction_ref: input.transactionRef
  };

  state.payments.push(payment);
  const activityLog: ActivityLogRecord = {
    id: randomUUID(),
    user_id: user.id,
    admin_id: null,
    action: 'payment_submitted',
    details: `${input.plan} payment submitted via ${input.paymentMethod} (${input.transactionRef})`,
    created_at: payment.submitted_at
  };
  state.activityLogs.push(activityLog);

  await syncPaymentToSupabase(payment);
  await syncActivityLogToSupabase(activityLog);

  return { ok: true, payment, user, duplicate: false };
}

export async function updatePaymentDecision(paymentId: string, decision: 'approved' | 'rejected', adminId: string | null) {
  ensureSeedData();

  const paymentIndex = state.payments.findIndex((payment) => payment.id === paymentId);
  if (paymentIndex === -1) {
    throw new Error('Payment not found.');
  }

  const payment = state.payments[paymentIndex] as PaymentRecord & { transaction_ref: string };
  if (payment.status === 'approved' && decision === 'approved') {
    throw new Error('This payment was already approved.');
  }

  payment.status = decision;
  payment.approved_by = adminId;
  payment.decision_note = decision === 'approved' ? 'Approved by admin' : 'Rejected by admin';

  const user = state.users.find((entry) => entry.id === payment.user_id);
  if (!user) {
    throw new Error('User record not found for this payment.');
  }

  if (decision === 'approved') {
    const alreadyActive = state.subscriptions.some(
      (subscription) => subscription.user_id === user.id && subscription.status === 'active'
    );

    if (!alreadyActive) {
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const subscription: SubscriptionRecord = {
        id: randomUUID(),
        user_id: user.id,
        plan: 'monthly',
        start_date: now.toISOString(),
        expiry_date: expiry.toISOString(),
        status: 'active'
      };
      state.subscriptions.push(subscription);
      await syncSubscriptionToSupabase(subscription);
    }
  }

  const activityLog: ActivityLogRecord = {
    id: randomUUID(),
    user_id: user.id,
    admin_id: adminId,
    action: `payment_${decision}`,
    details: `Payment ${payment.transaction_ref} marked as ${decision}.`,
    created_at: new Date().toISOString()
  };
  state.activityLogs.push(activityLog);

  await syncPaymentToSupabase(payment);
  await syncActivityLogToSupabase(activityLog);

  return {
    ok: true,
    payment,
    user
  };
}

export const notifyTelegramAdmins = async (message: string) => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, reason: 'Telegram bot is not configured.' };
  }

  const adminIds = getAdminChatIds();

  if (adminIds.length === 0) {
    return { ok: false, reason: 'No admin chat IDs configured.' };
  }

  const requests = adminIds.map(async (chatId) => {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    return response.ok;
  });

  await Promise.all(requests);
  return { ok: true };
};

export async function activateTrialForUser(input: {
  telegramId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  ensureSeedData();

  const user = upsertUser(input);
  const now = new Date();
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const trialExists = state.subscriptions.some(
    (subscription) => subscription.user_id === user.id && subscription.status === 'trial'
  );

  let subscription: SubscriptionRecord | undefined;
  if (!trialExists) {
    subscription = {
      id: randomUUID(),
      user_id: user.id,
      plan: 'trial',
      start_date: now.toISOString(),
      expiry_date: expiry.toISOString(),
      status: 'trial'
    };
    state.subscriptions.push(subscription);
    await syncSubscriptionToSupabase(subscription);
  }

  const activityLog: ActivityLogRecord = {
    id: randomUUID(),
    user_id: user.id,
    admin_id: null,
    action: 'free_trial_activated',
    details: '24h free trial activated for customer.',
    created_at: now.toISOString()
  };
  state.activityLogs.push(activityLog);
  await syncActivityLogToSupabase(activityLog);

  return {
    ok: true,
    user,
    trial: {
      plan: 'trial',
      startDate: now.toISOString(),
      expiryDate: expiry.toISOString(),
      status: 'trial'
    }
  };
}
