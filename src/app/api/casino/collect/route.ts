import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';

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
  if (session.status === 'active') return fail('Önce sonucu aç.', 400);
  if (session.status === 'collected') return ok({ collected: true, payout: session.payout });

  // Payout was credited at reveal — just mark it collected.
  await admin.from('casino_sessions').update({ status: 'collected' }).eq('id', session.id);
  return ok({ collected: true, payout: session.payout });
}
