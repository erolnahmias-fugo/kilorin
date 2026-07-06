import { AppShell } from '@/components/AppShell';
import { HomeScreen, type HomeState } from '@/components/screens/HomeScreen';
import { demoHome, MEAL_LABELS, type HomeView, type MealKey } from '@/components/demo';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/game/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { STREAK_STEP, STREAK_CAP_DAYS } from '@/lib/domain/constants';
import { istanbulDateStr, dayCloseInstant } from '@/lib/time';
import type { Tables } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

async function loadHome(): Promise<HomeView> {
  try {
    const ctx = await getSessionContext();
    const member = ctx.member;
    if (!member || member.status !== 'approved') return demoHome;

    const supabase = await createServerSupabase();
    const today = istanbulDateStr();

    const [logRes, balRes] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('member_id', member.id).eq('log_date', today).maybeSingle(),
      supabase.from('member_balances').select('balance').eq('member_id', member.id).maybeSingle(),
    ]);
    const log = logRes.data as Tables<'daily_logs'> | null;
    const bal = balRes.data as Tables<'member_balances'> | null;

    const kcal: Record<MealKey, number> = {
      breakfast: log?.breakfast_kcal ?? 0,
      lunch: log?.lunch_kcal ?? 0,
      dinner: log?.dinner_kcal ?? 0,
      snack: log?.snack_kcal ?? 0,
    };
    const hasPhoto: Record<MealKey, boolean> = {
      breakfast: !!log?.breakfast_photo,
      lunch: !!log?.lunch_photo,
      dinner: !!log?.dinner_photo,
      snack: !!log?.snack_photo,
    };
    const meals = (['breakfast', 'lunch', 'dinner', 'snack'] as MealKey[]).map((key) => ({
      key,
      label: MEAL_LABELS[key],
      kcal: kcal[key],
      photo: hasPhoto[key],
    }));

    const streak = member.streak_days ?? 0;
    return {
      balance: bal?.balance ?? demoHome.balance,
      todayDelta: demoHome.todayDelta,
      streakDays: streak,
      multiplier: 1 + STREAK_STEP * Math.min(streak, STREAK_CAP_DAYS),
      todayKcal: meals.reduce((s, m) => s + m.kcal, 0),
      targetKcal: member.daily_target_kcal ?? demoHome.targetKcal,
      meals,
      rewardEstimate: demoHome.rewardEstimate,
      dayCloseMs: dayCloseInstant(today).toMillis(),
    };
  } catch {
    return demoHome;
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; reward?: string; demo?: string }>;
}) {
  const sp = await searchParams;

  // Auth gate: signed-out → login, no membership yet / pending → onboarding.
  // `?demo=1` bypasses for design review with sample data.
  if (sp.demo !== '1') {
    const ctx = await getSessionContext();
    if (!ctx.userId) redirect('/login');
    if (!ctx.member || ctx.member.status !== 'approved') redirect('/onboarding');
  }

  const data = await loadHome();
  const state = (['streak-broken', 'shield'].includes(sp.state ?? '') ? sp.state : 'normal') as HomeState;
  return (
    <AppShell>
      <HomeScreen data={data} state={state} reward={sp.reward === '1'} />
    </AppShell>
  );
}
