import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const envPath = path.resolve(fileURLToPath(new URL('../../../../.env', import.meta.url)));
dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4001),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
  SUPABASE_ANON_KEY: z.string().min(10).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(5).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8).optional(),
  TELEGRAM_ADMIN_IDS: z.string().default(''),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().default(''),
  JWT_SECRET: z.string().min(16).optional(),
  ADMIN_SESSION_SECRET: z.string().min(16).default('test-admin-secret'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().min(6).default('admin123'),
  DOH_HOSTNAME: z.string().default('dns.nexbooster.local'),
  DOH_UPSTREAM_URL: z.string().url().default('https://dns.google/dns-query'),
  APP_BASE_URL: z.string().url().default('https://nexboost-ui.netlify.app'),
  MINIAPP_BASE_URL: z.string().url().default('https://nexboost-ui.netlify.app'),
  ADMIN_BASE_URL: z.string().url().default('https://nexboost-admin.netlify.app')
});

export type AppEnv = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);

export const getAdminChatIds = () => Array.from(new Set(
  [process.env.TELEGRAM_ADMIN_IDS ?? env.TELEGRAM_ADMIN_IDS, process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? env.TELEGRAM_ALLOWED_CHAT_IDS]
    .join(',')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
));

export const isSupabaseReady = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
export const isTelegramReady = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET);
