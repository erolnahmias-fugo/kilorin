import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { WEEKDAY_CODES } from '@/lib/time';
import type { TablesUpdate } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  lengthWeeks: z.number().int().positive().max(104).optional(),
  weighDays: z.array(z.enum(Object.keys(WEEKDAY_CODES) as [string, ...string[]])).optional(),
});

export async function POST(req: Request) {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, ctx, seasonId } = guard;

  const isAdmin = ctx.member!.is_admin || ctx.member!.seasons?.admin_id === ctx.userId;
  if (!isAdmin) return fail('Yetkin yok.', 403);

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return fail('Geçersiz istek.', 422);
  }

  const update: TablesUpdate<'seasons'> = {};
  if (parsed.lengthWeeks !== undefined) update.length_weeks = parsed.lengthWeeks;
  if (parsed.weighDays !== undefined) update.weigh_days = parsed.weighDays;
  if (!Object.keys(update).length) return fail('Güncellenecek bir şey yok.', 422);

  await admin.from('seasons').update(update).eq('id', seasonId);
  return ok({ seasonId, ...update });
}
