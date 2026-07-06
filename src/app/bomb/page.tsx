import { AppShell } from '@/components/AppShell';
import { BombScreen } from '@/components/screens/BombScreen';
import { getSessionContext } from '@/lib/game/session';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

async function load(): Promise<{ attackerName: string; deadlineMs: number }> {
  const fallback = { attackerName: 'Deniz', deadlineMs: Date.now() + 23 * 3600_000 + 41 * 60_000 };
  try {
    const ctx = await getSessionContext();
    if (!ctx.member) return fallback;
    const supabase = await createServerSupabase();
    const bombRes = await supabase
      .from('dessert_bombs')
      .select('attacker_member_id, deadline')
      .eq('target_member_id', ctx.member.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const bomb = bombRes.data as Pick<Tables<'dessert_bombs'>, 'attacker_member_id' | 'deadline'> | null;
    if (!bomb) return fallback;

    let attackerName = 'Biri';
    const attackerRes = await supabase
      .from('season_members')
      .select('user_id')
      .eq('id', bomb.attacker_member_id)
      .maybeSingle();
    const attacker = attackerRes.data as Pick<Tables<'season_members'>, 'user_id'> | null;
    if (attacker) {
      const uRes = await supabase.from('users').select('display_name').eq('id', attacker.user_id).maybeSingle();
      const u = uRes.data as Pick<Tables<'users'>, 'display_name'> | null;
      attackerName = u?.display_name ?? attackerName;
    }
    return { attackerName, deadlineMs: Date.parse(bomb.deadline) };
  } catch {
    return fallback;
  }
}

export default async function BombPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  const { attackerName, deadlineMs } = await load();
  return (
    <AppShell tab={false}>
      <BombScreen attackerName={attackerName} deadlineMs={deadlineMs} />
    </AppShell>
  );
}
