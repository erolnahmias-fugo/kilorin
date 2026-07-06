import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getSessionContext } from '@/lib/game/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeCalorieTarget, suggestSaferTarget } from '@/lib/domain/calories';
import { ACTIVITY_LEVELS, STARTING_BALANCE } from '@/lib/domain/constants';
import type { CalorieTargetInput } from '@/lib/domain/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z
  .object({
    seasonId: z.string().uuid().optional(),
    inviteCode: z.string().min(1).optional(),
    heightCm: z.number().positive().max(260),
    age: z.number().int().positive().max(120),
    sex: z.enum(['male', 'female']),
    currentKg: z.number().positive().max(500),
    targetKg: z.number().positive().max(500),
    activityId: z.string(),
  })
  .refine((b) => b.seasonId || b.inviteCode, { message: 'seasonId or inviteCode required' });

export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx.userId) return fail('Giriş yapmalısın.', 401);

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return fail('Geçersiz istek.', 422);
  }

  const activity = ACTIVITY_LEVELS.find((a) => a.id === parsed.activityId);
  if (!activity) return fail('Geçersiz aktivite seviyesi.', 422);

  const admin = createAdminClient();

  const seasonQuery = admin.from('seasons').select('*');
  const { data: season } = parsed.seasonId
    ? await seasonQuery.eq('id', parsed.seasonId).maybeSingle()
    : await seasonQuery.eq('invite_code', parsed.inviteCode!).maybeSingle();
  if (!season) return fail('Sezon bulunamadı.', 404);

  const calcInput: CalorieTargetInput = {
    sex: parsed.sex,
    age: parsed.age,
    heightCm: parsed.heightCm,
    currentKg: parsed.currentKg,
    targetKg: parsed.targetKg,
    activityFactor: activity.factor,
    seasonWeeks: season.length_weeks,
  };
  const result = computeCalorieTarget(calcInput);
  const safer = result.clamped ? suggestSaferTarget(calcInput) : null;

  const memberFields = {
    season_id: season.id,
    user_id: ctx.userId,
    status: 'pending',
    height_cm: parsed.heightCm,
    age: parsed.age,
    sex: parsed.sex,
    activity_factor: activity.factor,
    start_kg: parsed.currentKg,
    current_kg: parsed.currentKg,
    target_kg: parsed.targetKg,
    daily_target_kcal: result.dailyTarget,
    maintenance_kcal: result.tdee,
  };

  const { data: existing } = await admin
    .from('season_members')
    .select('id')
    .eq('season_id', season.id)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  let memberId: string;
  if (existing) {
    await admin.from('season_members').update(memberFields).eq('id', existing.id);
    memberId = existing.id;
  } else {
    const { data: inserted, error } = await admin
      .from('season_members')
      .insert(memberFields)
      .select('id')
      .single();
    if (error || !inserted) return fail('Kayıt oluşturulamadı.', 500);
    memberId = inserted.id;
    // Grant the starting balance exactly once, at first join.
    await admin.from('ledger').insert({
      member_id: memberId,
      season_id: season.id,
      type: 'season_start',
      amount: STARTING_BALANCE,
      description: 'Sezon başlangıç bakiyesi',
      ref_type: 'season',
      ref_id: season.id,
    });
  }

  return ok({ memberId, target: result, clamped: result.clamped, suggestSaferTarget: safer });
}
