import { AppShell } from '@/components/AppShell';
import { ProfileScreen, type ProfileData, type WeightPoint } from '@/components/screens/ProfileScreen';
import { getSessionContext } from '@/lib/game/session';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

const demoWeights: WeightPoint[] = [
  { label: 'H1', kg: 86.4 },
  { label: 'H2', kg: 85.8 },
  { label: 'H3', kg: 85.2 },
  { label: 'H4', kg: 84.6 },
  { label: 'H5', kg: 84.0 },
];

const demoProfile: ProfileData = {
  name: 'Emre',
  subtitle: 'AI Avatar · Sezon 2 · 🔥 12 gün',
  netWorth: 18920,
  startKg: 86.4,
  currentKg: 84.0,
  targetKg: 78.0,
  avatarUrl: null,
  weights: demoWeights,
  isAdmin: false,
};

async function load(): Promise<ProfileData> {
  try {
    const ctx = await getSessionContext();
    const member = ctx.member;
    if (!member) return demoProfile;

    const supabase = await createServerSupabase();
    const [uRes, balRes, weighRes] = await Promise.all([
      supabase.from('users').select('display_name, avatar_url').eq('id', member.user_id).maybeSingle(),
      supabase.from('member_balances').select('balance').eq('member_id', member.id).maybeSingle(),
      supabase.from('weigh_ins').select('weight_kg, weigh_date').eq('member_id', member.id).order('weigh_date', { ascending: true }).limit(8),
    ]);
    const u = uRes.data as Pick<Tables<'users'>, 'display_name' | 'avatar_url'> | null;
    const bal = balRes.data as Tables<'member_balances'> | null;
    const weighs = weighRes.data as Pick<Tables<'weigh_ins'>, 'weight_kg' | 'weigh_date'>[] | null;

    const weights: WeightPoint[] =
      weighs && weighs.length >= 2
        ? weighs.map((w, i) => ({ label: `H${i + 1}`, kg: w.weight_kg }))
        : demoWeights;

    return {
      name: u?.display_name ?? 'Sen',
      subtitle: `Sezon · 🔥 ${member.streak_days ?? 0} gün`,
      netWorth: bal?.balance ?? demoProfile.netWorth,
      startKg: member.start_kg ?? demoProfile.startKg,
      currentKg: member.current_kg ?? demoProfile.currentKg,
      targetKg: member.target_kg ?? demoProfile.targetKg,
      avatarUrl: member.ai_avatar_url ?? u?.avatar_url ?? null,
      weights,
      isAdmin: !!member.is_admin,
    };
  } catch {
    return demoProfile;
  }
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  const data = await load();
  return (
    <AppShell>
      <ProfileScreen data={data} />
    </AppShell>
  );
}
