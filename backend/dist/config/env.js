import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(10).optional(),
    SUPABASE_ANON_KEY: z.string().min(10).optional(),
    TELEGRAM_BOT_TOKEN: z.string().min(5).optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(8).optional(),
    JWT_SECRET: z.string().min(16).optional(),
    ADMIN_SESSION_SECRET: z.string().min(16).optional(),
    DOH_HOSTNAME: z.string().default('dns.nexbooster.local'),
    DOH_UPSTREAM_URL: z.string().url().default('https://dns.google/dns-query'),
    APP_BASE_URL: z.string().url().default('http://localhost:3000'),
    MINIAPP_BASE_URL: z.string().url().default('http://localhost:5173'),
    ADMIN_BASE_URL: z.string().url().default('http://localhost:5174')
});
export const env = envSchema.parse(process.env);
export const isSupabaseReady = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
export const isTelegramReady = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET);
