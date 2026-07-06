import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { notify } from '@/lib/game/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ memberId: z.string().uuid(), approve: z.boolean() });

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

  const { data: target } = await admin
    .from('season_members')
    .select('id, season_id')
    .eq('id', parsed.memberId)
    .maybeSingle();
  if (!target || target.season_id !== seasonId) return fail('Üye bulunamadı.', 404);

  const status = parsed.approve ? 'approved' : 'rejected';
  await admin.from('season_members').update({ status }).eq('id', target.id);

  await notify(
    admin,
    target.id,
    'approval',
    parsed.approve ? 'Sezona kabul edildin!' : 'Başvurun reddedildi',
    parsed.approve ? 'Artık oynayabilirsin.' : undefined,
  );

  return ok({ memberId: target.id, status });
}
