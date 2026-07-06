import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { istanbulDateStr } from '@/lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Meals = z.object({
  breakfast: z.number().min(0).optional(),
  lunch: z.number().min(0).optional(),
  dinner: z.number().min(0).optional(),
  snack: z.number().min(0).optional(),
});
const Photos = z.object({
  breakfast: z.string().optional(),
  lunch: z.string().optional(),
  dinner: z.string().optional(),
  snack: z.string().optional(),
});
const Body = z.object({ meals: Meals.optional(), photos: Photos.optional() });

export async function POST(req: Request) {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, memberId, seasonId, ctx } = guard;

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return fail('Geçersiz istek.', 422);
  }

  const date = istanbulDateStr();
  const { data: existing } = await admin
    .from('daily_logs')
    .select('*')
    .eq('member_id', memberId)
    .eq('log_date', date)
    .maybeSingle();

  const m = parsed.meals ?? {};
  const p = parsed.photos ?? {};
  const record = {
    member_id: memberId,
    log_date: date,
    breakfast_kcal: m.breakfast ?? existing?.breakfast_kcal ?? 0,
    lunch_kcal: m.lunch ?? existing?.lunch_kcal ?? 0,
    dinner_kcal: m.dinner ?? existing?.dinner_kcal ?? 0,
    snack_kcal: m.snack ?? existing?.snack_kcal ?? 0,
    breakfast_photo: p.breakfast ?? existing?.breakfast_photo ?? null,
    lunch_photo: p.lunch ?? existing?.lunch_photo ?? null,
    dinner_photo: p.dinner ?? existing?.dinner_photo ?? null,
    snack_photo: p.snack ?? existing?.snack_photo ?? null,
  };

  await admin.from('daily_logs').upsert(record, { onConflict: 'member_id,log_date' });

  const todayTotal =
    record.breakfast_kcal + record.lunch_kcal + record.dinner_kcal + record.snack_kcal;
  const target = ctx.member?.daily_target_kcal ?? 0;
  void seasonId;

  return ok({ todayTotal, target, marginKcal: target - todayTotal });
}
