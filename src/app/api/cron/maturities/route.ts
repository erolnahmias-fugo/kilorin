import { assertCron, ok } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { processMaturities } from '@/lib/game/maturities';
import { revealCasino } from '@/lib/game/reveal';
import { notify } from '@/lib/game/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Every 15 minutes — settles time-driven positions and auto-reveals casino tables.
export async function GET(req: Request) {
  const c = assertCron(req);
  if (c) return c;

  const admin = createAdminClient();
  const summary = await processMaturities(admin);

  const nowISO = new Date().toISOString();
  const { data: sessions } = await admin
    .from('casino_sessions')
    .select('*')
    .eq('status', 'active')
    .lte('end_at', nowISO);

  let revealed = 0;
  for (const session of sessions ?? []) {
    const result = await revealCasino(admin, session);
    if (!result) continue;
    revealed++;
    await notify(
      admin,
      session.member_id,
      'casino',
      `Kumarhane sonucu: x${result.multiplier.toFixed(1)}`,
      `${result.payout} KLR kazandın.`,
      { sessionId: session.id, multiplier: result.multiplier, payout: result.payout },
    );
  }

  return ok({ ...summary, casinoRevealed: revealed });
}
