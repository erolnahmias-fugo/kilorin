import { z } from 'zod';
import { fail, ok, rpcError, requireApprovedMember } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  stake: z.number().int().positive(),
  hours: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(6)]),
});

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

  try {
    const { data, error } = await admin.rpc('casino_sit', {
      p_member: memberId,
      p_stake: parsed.stake,
      p_hours: parsed.hours,
    });
    if (error) throw error;
    return ok({ sessionId: data });
  } catch (e) {
    return rpcError(e);
  }
}
