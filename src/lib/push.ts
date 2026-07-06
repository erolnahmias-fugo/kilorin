import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './supabase/database.types';
import { env } from './env';

type Admin = SupabaseClient<Database>;

/** Shape the browser Push API hands us. */
export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let configured: boolean | null = null;

/** Lazily configure VAPID from env. Returns false (no-op mode) when keys are missing. */
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = env.vapidPublic();
  const priv = env.vapidPrivate();
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(env.vapidSubject(), pub, priv);
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

/** Store (or refresh) a browser push subscription for a user. Never throws. */
export async function subscribeMember(admin: Admin, userId: string, sub: WebPushSubscription): Promise<void> {
  try {
    await admin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
        { onConflict: 'endpoint' },
      );
  } catch (e) {
    console.error('subscribeMember failed', e);
  }
}

/** Best-effort web push to every device a member has registered. Never throws. */
export async function sendToMember(admin: Admin, memberId: string, payload: unknown): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    const { data: member } = await admin
      .from('season_members')
      .select('user_id')
      .eq('id', memberId)
      .maybeSingle();
    if (!member?.user_id) return;

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', member.user_id);
    if (!subs?.length) return;

    const body = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
          );
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          // Prune dead subscriptions.
          if (status === 404 || status === 410) {
            await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          }
        }
      }),
    );
  } catch (e) {
    console.error('sendToMember failed', e);
  }
}
