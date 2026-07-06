import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { revealCasino } from '@/lib/game/reveal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ sessionId: z.string().uuid() });

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

  const { data: session } = await admin
    .from('casino_sessions')
    .select('*')
    .eq('id', parsed.sessionId)
    .eq('member_id', memberId)
    .maybeSingle();
  if (!session) return fail('Bulunamadı.', 404);

  if (Date.now() < new Date(session.end_at).getTime()) return fail('Süre dolmadı.', 400);

  // Already resolved — return the stored result.
  if (session.status !== 'active') {
    return ok({
      multiplier: session.result_multiplier,
      payout: session.payout,
      percentile: session.percentile,
    });
  }

  const result = await revealCasino(admin, session);
  if (!result) return fail('Süre dolmadı.', 400);
  return ok({ multiplier: result.multiplier, payout: result.payout, percentile: result.percentile });
}
