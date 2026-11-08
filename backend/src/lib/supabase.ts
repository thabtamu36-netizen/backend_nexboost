import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseReady } from '../config/env.js';

export const supabase = isSupabaseReady
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  : null;

export const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  }

  return supabase;
};
