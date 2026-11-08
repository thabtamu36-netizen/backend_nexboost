import type { Request, Response, NextFunction } from 'express';
import { env, isTelegramReady } from '../config/env.js';

export type TelegramAuthRequest = Request & {
  telegramUser?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
  };
};

export function requireTelegramAuth(req: TelegramAuthRequest, res: Response, next: NextFunction) {
  if (!isTelegramReady) {
    return res.status(503).json({
      error: 'Telegram bot credentials are not configured.'
    });
  }

  const authHeader = req.headers.authorization;
  const telegramInitData = req.headers['x-telegram-init-data'];

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      error: 'Missing Telegram authorization header.'
    });
  }

  if (!telegramInitData || typeof telegramInitData !== 'string') {
    return res.status(401).json({
      error: 'Missing Telegram init data.'
    });
  }

  // Phase 1: validate the presence and basic shape of the Telegram payload.
  // A production-grade implementation should verify the HMAC signature using the bot token.
  const initData = new URLSearchParams(telegramInitData);
  const user = initData.get('user');

  if (!user) {
    return res.status(401).json({      error: 'Telegram user payload is missing.'
    });
  }

  let parsedUser: Record<string, unknown>;

  try {
    parsedUser = JSON.parse(user) as Record<string, unknown>;
  } catch {
    return res.status(401).json({
      error: 'Telegram user payload is invalid.'
    });
  }

  const telegramId = Number(parsedUser.id);

  if (!Number.isFinite(telegramId)) {
    return res.status(401).json({
      error: 'Telegram user id is invalid.'
    });
  }

  req.telegramUser = {
    id: telegramId,
    username: typeof parsedUser.username === 'string' ? parsedUser.username : undefined,
    first_name: typeof parsedUser.first_name === 'string' ? parsedUser.first_name : undefined,
    last_name: typeof parsedUser.last_name === 'string' ? parsedUser.last_name : undefined,
    language_code: typeof parsedUser.language_code === 'string' ? parsedUser.language_code : undefined
  };

  if (authHeader !== `Bearer ${env.TELEGRAM_BOT_TOKEN}`) {
    return res.status(401).json({
      error: 'Telegram authorization token is invalid.'
    });
  }

  next();
}
