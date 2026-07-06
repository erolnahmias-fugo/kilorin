import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { istanbulDateStr, seasonFraction } from '@/lib/time';
import { evaluateSuspicion, expectedWeight } from '@/lib/domain/suspicion';
import { WEIGH_IN_REWARD, WEIGH_IN_TOLERANCE_KG } from '@/lib/domain/constants';
import type { Json } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  weightKg: z.number().positive().max(500),
  photoPath: z.string().optional(),
});

export async function POST(req: Request) {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, memberId, seasonId, ctx } = guard;
  const member = ctx.member!;
  const season = member.seasons;

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return fail('Geçersiz istek.', 422);
  }

  const today = istanbulDateStr();
  const startKg = member.start_kg ?? parsed.weightKg;
  const targetKg = member.target_kg ?? startKg;
  const fraction = season ? seasonFraction(season.start_date, season.length_weeks) : 0;
  const expectedKg = expectedWeight(startKg, targetKg, fraction);
  const eligible = parsed.weightKg <= expectedKg + WEIGH_IN_TOLERANCE_KG;

  // Suspicion cross-check against the previous weigh-in.
  const { data: prev } = await admin
    .from('weigh_ins')
    .select('weigh_date, weight_kg')
    .eq('member_id', memberId)
    .lt('weigh_date', today)
    .order('weigh_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  let suspicionJson: Json | null = null;
  let suspicious = member.suspicious;
  if (prev) {
    const days = Math.max(1, Math.round((Date.parse(today) - Date.parse(prev.weigh_date)) / 86_400_000));
    const { data: logs } = await admin
      .from('daily_logs')
      .select('breakfast_kcal, lunch_kcal, dinner_kcal, snack_kcal')
      .eq('member_id', memberId)
      .gt('log_date', prev.weigh_date)
      .lte('log_date', today);
    const sumConsumedKcal = (logs ?? []).reduce(
      (s, l) => s + l.breakfast_kcal + l.lunch_kcal + l.dinner_kcal + l.snack_kcal,
      0,
    );
    const sumMaintenanceKcal = (member.maintenance_kcal ?? 0) * days;
    const result = evaluateSuspicion({
      prevWeightKg: prev.weight_kg,
      currWeightKg: parsed.weightKg,
      sumMaintenanceKcal,
      sumConsumedKcal,
    });
    suspicious = result.suspicious;
    suspicionJson = { ...result, days } as unknown as Json;
  }

  await admin.from('weigh_ins').insert({
    member_id: memberId,
    weigh_date: today,
    weight_kg: parsed.weightKg,
    photo_path: parsed.photoPath ?? null,
    expected_kg: expectedKg,
    reward_given: eligible,
    suspicion: suspicionJson,
  });

  // Reward is granted immediately; an admin can reverse it later on photo review.
  if (eligible) {
    await admin.from('ledger').insert({
      member_id: memberId,
      season_id: seasonId,
      type: 'weigh_in_reward',
      amount: WEIGH_IN_REWARD,
      description: 'Tartı ödülü',
      ref_type: 'weigh_in',
    });
  }

  await admin
    .from('season_members')
    .update({ current_kg: parsed.weightKg, suspicious })
    .eq('id', memberId);

  return ok({ expectedKg, eligible, suspicious });
}
