import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';
import { positionValue } from '../domain/market';
import { depositValue, netWorth } from '../domain/networth';
import { getPrices, type PriceQuote } from '../prices';

type Admin = SupabaseClient<Database>;
type Position = Tables<'positions'>;

export interface ValuedPosition extends Position {
  currentValue: number;
  pnlPct: number;
  liquidated: boolean;
  delayed: boolean;
}

/** Values a single open position (deposit accrual, leveraged mark-to-market, or flat asset). */
export function valuePosition(p: Position, quote: PriceQuote | undefined, nowMs: number): ValuedPosition {
  const openedMs = new Date(p.opened_at).getTime();
  let currentValue = p.amount_klr;
  let pnlPct = 0;
  let liquidated = false;

  if (p.type === 'interest') {
    const maturesMs = p.lock_end ? new Date(p.lock_end).getTime() : openedMs;
    currentValue = depositValue({
      principal: p.amount_klr, rate: Number(p.rate ?? 0),
      openedAtMs: openedMs, maturesAtMs: maturesMs, nowMs,
    });
    pnlPct = Math.round((currentValue / p.amount_klr - 1) * 1000) / 10;
  } else if (['crypto', 'stock', 'fx', 'fund'].includes(p.type)) {
    const hoursHeld = (nowMs - openedMs) / 3_600_000;
    const v = positionValue({
      entryKlr: p.amount_klr, leverage: Number(p.leverage ?? 1),
      entryPrice: Number(p.entry_price ?? 1), currentPrice: quote?.price ?? Number(p.entry_price ?? 1),
      hoursHeld,
    });
    currentValue = v.value;
    pnlPct = v.pnlPct;
    liquidated = v.liquidated;
  } else {
    // real_estate / car / watch — value holds near purchase price (rent accrues via ledger).
    currentValue = p.amount_klr;
  }

  return { ...p, currentValue, pnlPct, liquidated, delayed: quote?.delayed ?? false };
}

/** Loads and values a member's open positions. */
export async function valueMemberPositions(admin: Admin, memberId: string): Promise<ValuedPosition[]> {
  const { data: positions } = await admin
    .from('positions')
    .select('*')
    .eq('member_id', memberId)
    .in('status', ['open', 'listed']);
  if (!positions?.length) return [];

  const instrumentIds = [...new Set(positions.map((p) => p.instrument_id).filter(Boolean) as string[])];
  const quotes = instrumentIds.length ? await getPrices(instrumentIds) : {};
  const now = Date.now();
  return positions.map((p) => valuePosition(p, p.instrument_id ? quotes[p.instrument_id] : undefined, now));
}

export async function memberBalance(admin: Admin, memberId: string): Promise<number> {
  const { data } = await admin.rpc('member_balance', { p_member: memberId });
  return data ?? 0;
}

export async function computeNetWorth(admin: Admin, memberId: string): Promise<{ net: number; liquid: number; valued: ValuedPosition[] }> {
  const [liquid, valued] = await Promise.all([memberBalance(admin, memberId), valueMemberPositions(admin, memberId)]);
  let deposits = 0, positions = 0, prestige = 0;
  for (const v of valued) {
    if (v.type === 'interest') deposits += v.currentValue;
    else if (['crypto', 'stock', 'fx', 'fund'].includes(v.type)) positions += v.currentValue;
    else prestige += v.currentValue;
  }
  return { net: netWorth({ liquid, deposits, positions, prestige }), liquid, valued };
}

export interface LeaderRow {
  memberId: string;
  displayName: string;
  streak: number;
  suspicious: boolean;
  netWorth: number;
}

/** Net-worth ranking for a season (service-role; used by the leaderboard route). */
export async function computeLeaderboard(admin: Admin, seasonId: string): Promise<LeaderRow[]> {
  const { data: members } = await admin
    .from('season_members')
    .select('id, streak_days, suspicious, users(display_name)')
    .eq('season_id', seasonId)
    .eq('status', 'approved');
  if (!members?.length) return [];

  const rows = await Promise.all(
    members.map(async (m) => {
      const { net } = await computeNetWorth(admin, m.id);
      const u = m.users as unknown as { display_name: string | null } | null;
      return {
        memberId: m.id,
        displayName: u?.display_name ?? 'Oyuncu',
        streak: m.streak_days,
        suspicious: m.suspicious,
        netWorth: net,
      };
    }),
  );
  return rows.sort((a, b) => b.netWorth - a.netWorth);
}
