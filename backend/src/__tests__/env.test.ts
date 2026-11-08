import { describe, expect, it } from 'vitest';
import { getAdminChatIds } from '../config/env.js';

describe('env config', () => {
  it('supports TELEGRAM_ADMIN_IDS and TELEGRAM_ALLOWED_CHAT_IDS as admin chat sources', () => {
    process.env.TELEGRAM_ADMIN_IDS = '123,456';
    process.env.TELEGRAM_ALLOWED_CHAT_IDS = '789';

    expect(getAdminChatIds()).toEqual(['123', '456', '789']);

    delete process.env.TELEGRAM_ADMIN_IDS;
    delete process.env.TELEGRAM_ALLOWED_CHAT_IDS;
  });
});
