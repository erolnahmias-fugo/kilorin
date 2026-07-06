import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';
import { rollCasino, casinoPayout } from '../domain/casino';
import { applySuspicion } from '../domain/rewards';
import type { CasinoHours } from '../domain/constants';

type Admin = SupabaseClient<Database>;
type Session = Tables<'casino_sessions'>;

export interface CasinoRevealResult {
  multiplier: number;
  payout: number;
  percentile: number;
  penalty: number;
}

/**
 * Resolves a casino session once its timer has elapsed: rolls the multiplier,
 * applies the suspicion shave, credits the net payout to the ledger, and stamps
 * the session as revealed. Returns null when the session is not eligible
 * (not active, or timer not yet up).
 */
export async function revealCasino(admin: Admin, session: Session): Promise<CasinoRevealResult | null> {
  if (session.status !== 'active') return null;
  if (Date.now() < new Date(session.end_at).getTime()) return null;

  const roll = rollCasino(session.hours as CasinoHours);
  const gross = casinoPayout(session.stake, roll.multiplier);

  const { data: member } = await admin
    .from('season_members')
    .select('suspicious')
    .eq('id', session.member_id)
    .maybeSingle();
  const { net, penalty } = applySuspicion(gross, member?.suspicious ?? false);

  if (net > 0) {
    await admin.from('ledger').insert({
      member_id: session.member_id,
      season_id: session.season_id,
      type: 'casino_payout',
      amount: net,
      description: `Kumarhane x${roll.multiplier.toFixed(1)}`,
      ref_type: 'casino',
      ref_id: session.id,
    });
  }

  await admin
    .from('casino_sessions')
    .update({
      result_multiplier: roll.multiplier,
      payout: net,
      percentile: roll.percentile,
      status: 'revealed',
      revealed_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  return { multiplier: roll.multiplier, payout: net, percentile: roll.percentile, penalty };
}
