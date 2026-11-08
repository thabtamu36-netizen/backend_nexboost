import { afterEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';

const servers: Array<{ close: () => void }> = [];

afterEach(() => {
  for (const server of servers) {
    server.close();
  }
  servers.length = 0;
});

describe('backend health service', () => {
  it('returns a healthy response from the API root', async () => {
    const app = createApp();
    const server = app.listen(0);
    servers.push(server);

    const port = (server.address() as AddressInfo).port;
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.service).toBe('nexbooster-backend');
    expect(payload.environment).toBeDefined();
  });

  it('exposes the admin dashboard summary and payment workflow endpoints', async () => {
    const app = createApp();
    const server = app.listen(0);
    servers.push(server);

    const port = (server.address() as AddressInfo).port;

    const authResponse = await fetch(`http://127.0.0.1:${port}/api/admin/dashboard`, {
      headers: {
        Authorization: 'Bearer test-admin-secret'
      }
    });

    expect(authResponse.status).toBe(200);
    const dashboard = await authResponse.json();
    expect(dashboard).toHaveProperty('stats');
    expect(Array.isArray(dashboard.payments)).toBe(true);

    const paymentResponse = await fetch(`http://127.0.0.1:${port}/api/payments/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-admin-secret'
      },
      body: JSON.stringify({
        telegramId: 987654321,
        username: 'sample_user',
        firstName: 'Sample',
        lastName: 'User',
        plan: 'monthly',
        amount: 349,
        paymentMethod: 'telebirr',
        transactionRef: 'TEST-REF-001'
      })
    });

    expect(paymentResponse.status).toBe(200);
    const submission = await paymentResponse.json();
    expect(submission.ok).toBe(true);
    expect(submission.payment.status).toBe('pending');
  });
});
