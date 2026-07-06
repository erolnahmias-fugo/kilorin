import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../supabase/database.types';
import { sendToMember } from '../push';

type Admin = SupabaseClient<Database>;

/**
 * Records an in-app notification and fires a best-effort web push.
 * Push failures never bubble up — the DB row is the source of truth.
 */
export async function notify(
  admin: Admin,
  memberId: string,
  kind: string,
  title: string,
  body?: string,
  data?: Json,
): Promise<void> {
  try {
    await admin.from('notifications').insert({
      member_id: memberId,
      kind,
      title,
      body: body ?? null,
      data: data ?? {},
    });
  } catch (e) {
    console.error('notify insert failed', e);
  }
  try {
    await sendToMember(admin, memberId, { kind, title, body, data });
  } catch {
    // best-effort; already logged inside sendToMember
  }
}
