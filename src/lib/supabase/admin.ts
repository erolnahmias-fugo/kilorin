import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env } from '../env';

/**
 * Service-role client — bypasses RLS. Server-only. Used by API routes (after
 * authenticating the user) and cron jobs to run the privileged game mutations.
 */
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
