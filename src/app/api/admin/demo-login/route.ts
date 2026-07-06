import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { fail } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-click login for the seeded demo players, whose @kilorin.test addresses
 * can't receive real e-mail. Guarded by CRON_SECRET and restricted to the
 * demo domain, so it is NOT a general auth bypass. Remove alongside
 * /api/admin/seed once the real season starts.
 *
 *   /api/admin/demo-login?secret=<CRON_SECRET>&email=deniz@kilorin.test
 *
 * Generates a magic link server-side, verifies its token immediately (no
 * e-mail, no Supabase redirect allowlist involved), sets the session cookie
 * and lands on the home screen.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return fail('unauthorized', 401);
  }
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!email.endsWith('@kilorin.test')) {
    return fail('Sadece @kilorin.test demo hesapları için.', 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error || !data.properties?.hashed_token) {
    return fail(`generateLink: ${error?.message ?? 'no token'} — önce seed'i çalıştırdın mı?`, 400);
  }

  const supabase = await createServerSupabase();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) return fail(`verifyOtp: ${verifyError.message}`, 400);

  return NextResponse.redirect(new URL('/', url.origin));
}
