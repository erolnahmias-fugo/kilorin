import { z } from 'zod';
import { fail, ok, rpcError, requireApprovedMember } from '@/lib/api';
import { getPrice } from '@/lib/prices';
import { valuePosition } from '@/lib/game/portfolio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ positionId: z.string().uuid() });

export async function POST(req: Request) {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, memberId } = guard;

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return fail('Geçersiz istek.', 422);
  }

  const { data: position } = await admin
    .from('positions')
    .select('*')
    .eq('id', parsed.positionId)
    .eq('member_id', memberId)
    .maybeSingle();
  if (!position) return fail('Bulunamadı.', 404);
  if (position.status !== 'open') return fail('Bu pozisyon kapalı.', 400);

  const quote = position.instrument_id ? await getPrice(position.instrument_id) : undefined;
  const valued = valuePosition(position, quote, Date.now());
  const value = Math.max(0, Math.round(valued.currentValue));

  try {
    const { data, error } = await admin.rpc('sell_position', {
      p_member: memberId,
      p_position: position.id,
      p_value: value,
    });
    if (error) throw error;
    return ok({ value: data ?? value });
  } catch (e) {
    return rpcError(e);
  }
}
