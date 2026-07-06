import { createServerSupabase } from '../supabase/server';
import type { Tables } from '../supabase/database.types';

export interface SessionContext {
  userId: string | null;
  member: (Tables<'season_members'> & { seasons: Tables<'seasons'> | null }) | null;
}

/**
 * Resolves the signed-in user and their most recent season membership
 * (any status — callers branch on pending/approved). Returns nulls when signed out.
 */
export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, member: null };

  const { data: member } = await supabase
    .from('season_members')
    .select('*, seasons(*)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { userId: user.id, member: (member as SessionContext['member']) ?? null };
}

/** Convenience: throws-free approved-member guard for pages. */
export function isApproved(ctx: SessionContext): boolean {
  return !!ctx.member && ctx.member.status === 'approved';
}
