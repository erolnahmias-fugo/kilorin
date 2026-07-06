import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json, Tables } from '../supabase/database.types';
import { generateShowcase } from '../domain/market';
import { computeLeaderboard } from './portfolio';

type Admin = SupabaseClient<Database>;
type Season = Tables<'seasons'>;

/** Rough season-wide net worth used to scale real-estate pricing. */
async function approxNetWorth(admin: Admin, seasonId: string): Promise<number> {
  try {
    const board = await computeLeaderboard(admin, seasonId);
    if (!board.length) return 10000;
    const avg = board.reduce((s, r) => s + r.netWorth, 0) / board.length;
    return Math.max(2000, Math.round(avg));
  } catch {
    return 10000;
  }
}

export interface ShowcaseResult {
  seasonId: string;
  offerCount: number;
  nextShowcaseAt: string;
}

/**
 * Deactivates the season's current offers and spawns a fresh showcase,
 * then schedules the next refresh 4–8h out.
 */
export async function refreshShowcase(admin: Admin, season: Season): Promise<ShowcaseResult> {
  const net = await approxNetWorth(admin, season.id);
  const drafts = generateShowcase(Math.random, net);
  const now = new Date();
  const nowISO = now.toISOString();

  // Retire the current showcase.
  await admin
    .from('market_offers')
    .update({ active: false })
    .eq('season_id', season.id)
    .eq('active', true);

  const rows: Database['public']['Tables']['market_offers']['Insert'][] = drafts.map((d) => ({
    season_id: season.id,
    type: d.type,
    title: d.title,
    subtitle: d.subtitle ?? null,
    instrument_id: d.instrumentId ?? null,
    symbol: d.symbol ?? null,
    lock_hours: d.lockHours ?? null,
    rate: d.rate ?? null,
    is_trap: d.isTrap ?? false,
    leverage: d.leverage ?? null,
    price_per_lot: d.pricePerLot,
    stock: d.stock,
    min_stake: d.minStake ?? null,
    rent_per_day: d.rentPerDay ?? null,
    terms: (d.terms ?? {}) as Json,
    active: true,
    spawn_at: nowISO,
  }));
  if (rows.length) await admin.from('market_offers').insert(rows);

  // Next refresh in 4–8 hours.
  const nextMs = now.getTime() + (4 + Math.random() * 4) * 3_600_000;
  const nextShowcaseAt = new Date(nextMs).toISOString();
  await admin.from('seasons').update({ next_showcase_at: nextShowcaseAt }).eq('id', season.id);

  return { seasonId: season.id, offerCount: rows.length, nextShowcaseAt };
}
