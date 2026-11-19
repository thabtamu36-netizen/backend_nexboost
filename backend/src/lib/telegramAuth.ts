
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export type VerifiedTelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export function verifyTelegramInitData(initData: string): VerifiedTelegramUser {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram authentication is not configured.');
  }

  if (!initData || initData.length > 16_384) {
    throw new Error('Invalid Telegram authentication data.');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');

  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new Error('Invalid Telegram authentication signature.');
  }

  params.delete('hash');
  params.delete('signature');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(env.TELEGRAM_BOT_TOKEN)
    .digest();

  const calculatedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest();

  const suppliedHash = Buffer.from(receivedHash, 'hex');

  if (
    suppliedHash.length !== calculatedHash.length ||
    !timingSafeEqual(suppliedHash, calculatedHash)
  ) {
    throw new Error('Telegram authentication could not be verified.');
  }

  const authDate = Number(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isInteger(authDate) || authDate <= 0 || now - authDate > 86_400 || authDate > now + 60) {
    throw new Error('Telegram session has expired. Reopen NEXBOOST from Telegram.');
  }

  const userValue = params.get('user');

  if (!userValue) {
    throw new Error('Telegram user information is missing.');
  }

  let user: VerifiedTelegramUser;

  try {
    user = JSON.parse(userValue) as VerifiedTelegramUser;
  } catch {
    throw new Error('Invalid Telegram user information.');
  }

  if (!Number.isSafeInteger(user.id) || user.id <= 0) {
    throw new Error('Invalid Telegram user identity.');
  }

  return user;
}
