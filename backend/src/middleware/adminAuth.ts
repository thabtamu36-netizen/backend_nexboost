import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export type AdminAuthRequest = Request & {
  admin?: {
    username: string;
    role: 'admin' | 'superadmin';
  };
};

export function requireAdminAuth(req: AdminAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      error: 'Missing or invalid admin authorization header.'
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token !== env.ADMIN_SESSION_SECRET) {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden: invalid administrator token.'
    });
  }

  req.admin = {
    username: env.ADMIN_USERNAME,
    role: 'superadmin'
  };

  next();
}
