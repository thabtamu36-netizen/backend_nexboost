import { Router } from 'express';
import { env } from '../config/env.js';
import { getSupabase } from '../lib/supabase.js';
export const healthRouter = Router();
healthRouter.get('/', async (_req, res) => {
    try {
        const supabase = getSupabase();
        const { error } = await supabase.from('users').select('id').limit(1);
        res.json({
            ok: true,
            service: 'nexbooster-backend',
            environment: env.NODE_ENV,
            supabase: error ? 'unreachable' : 'connected'
        });
    }
    catch (error) {
        res.json({
            ok: true,
            service: 'nexbooster-backend',
            environment: env.NODE_ENV,
            supabase: 'not-configured',
            note: error instanceof Error ? error.message : 'Unknown configuration state'
        });
    }
});
