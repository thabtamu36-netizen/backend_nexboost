import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { paymentsRouter } from './routes/payments.js';
import { dohRouter } from './routes/dns.js';

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: false
  }));
  app.use(cors({
    origin: [
      env.MINIAPP_BASE_URL,
      env.ADMIN_BASE_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:4000'
    ],
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/', (_req, res) => {
    res.json({
      name: 'NEXBOOST API',
      status: 'running',
      environment: env.NODE_ENV,
      version: '1.0.0'
    });
  });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/dns', dohRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled application error:', err);
    res.status(500).json({
      error: 'Internal Server Error'
    });
  });

  return app;
}
