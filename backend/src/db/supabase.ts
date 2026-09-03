import dotenv from 'dotenv';
dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY && process.env.NODE_ENV !== 'test') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment');
}

export const supabase: SupabaseClient = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : (new Proxy({}, {
      get(_target, prop) {
        if (process.env.NODE_ENV === 'test') {
          throw new Error(`Attempted to call supabase.${String(prop)} in test environment without mocking.`);
        }
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment');
      },
    }) as unknown as SupabaseClient);

export default supabase;

