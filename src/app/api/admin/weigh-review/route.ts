import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { WEIGH_IN_REWARD } from '@/lib/domain/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ weighInId: z.string().uuid(), reject: z.boolean() });

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

  const { data: weigh } = await admin
    .from('weigh_ins')
    .select('*')
    .eq('id', parsed.weighInId)
    .maybeSingle();
  if (!weigh) return fail('Tartı bulunamadı.', 404);

  const { data: owner } = await admin
    .from('season_members')
    .select('season_id')
    .eq('id', weigh.member_id)
    .maybeSingle();
  if (!owner || owner.season_id !== seasonId) return fail('Tartı bulunamadı.', 404);

  if (!parsed.reject) {
    await admin.from('weigh_ins').update({ admin_rejected: false }).eq('id', weigh.id);
    return ok({ weighInId: weigh.id, rejected: false });
  }

  // Reverse the reward if it was already paid.
  if (weigh.reward_given) {
    await admin.from('ledger').insert({
      member_id: weigh.member_id,
      season_id: seasonId,
      type: 'weigh_in_reversal',
      amount: -WEIGH_IN_REWARD,
      description: 'Tartı ödülü iptali',
      ref_type: 'weigh_in',
      ref_id: weigh.id,
    });
  }
  await admin.from('weigh_ins').update({ admin_rejected: true }).eq('id', weigh.id);

  return ok({ weighInId: weigh.id, rejected: true, reversed: weigh.reward_given });
}
