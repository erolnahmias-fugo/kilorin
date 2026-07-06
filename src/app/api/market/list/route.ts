import { z } from 'zod';
import { fail, ok, rpcError, requireApprovedMember } from '@/lib/api';

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

  try {
    const { error } = await admin.rpc('list_position', {
      p_member: memberId,
      p_position: parsed.positionId,
    });
    if (error) throw error;
    return ok({ listed: true });
  } catch (e) {
    return rpcError(e);
  }
}
