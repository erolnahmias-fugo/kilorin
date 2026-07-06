import { redirect } from 'next/navigation';
import { getSessionContext, type SessionContext } from './session';

/**
 * Page guard for app screens: signed-out → /login, not-yet-approved → /onboarding.
 * Pass `demo=true` (from a `?demo=1` search param) to bypass for design review.
 * Returns the session context for the page to reuse.
 */
export async function requireApprovedPage(demo?: boolean): Promise<SessionContext | null> {
  if (demo) return null;
  const ctx = await getSessionContext();
  if (!ctx.userId) redirect('/login');
  if (!ctx.member || ctx.member.status !== 'approved') redirect('/onboarding');
  return ctx;
}
