import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';
import { depositValue } from '../domain/networth';
import { MARKET_INSTRUMENTS } from '../domain/types';
import { getPrices } from '../prices';
import { valuePosition } from './portfolio';

type Admin = SupabaseClient<Database>;
type Position = Tables<'positions'>;

export interface MaturitiesSummary {
  matured: number;
  settled: number;
  rentPaid: number;
  liquidated: number;
}

/**
 * Sweeps time-driven position outcomes across ALL seasons:
 *  - matured fixed deposits (credit principal + full interest)
 *  - settled listings past their 24h window (credit current value)
 *  - daily real-estate rent (one row per unpaid elapsed day)
 *  - liquidation of leveraged positions whose mark-to-market hit zero
 */
export async function processMaturities(admin: Admin): Promise<MaturitiesSummary> {
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  const summary: MaturitiesSummary = { matured: 0, settled: 0, rentPaid: 0, liquidated: 0 };

  // ── 1. Mature fixed deposits ────────────────────────────────────────────
  const { data: deposits } = await admin
    .from('positions')
    .select('*')
    .eq('status', 'open')
    .eq('type', 'interest')
    .lte('lock_end', nowISO);

  for (const p of deposits ?? []) {
    const openedMs = new Date(p.opened_at).getTime();
    const maturesMs = p.lock_end ? new Date(p.lock_end).getTime() : openedMs;
    const value = depositValue({
      principal: p.amount_klr,
      rate: Number(p.rate ?? 0),
      openedAtMs: openedMs,
      maturesAtMs: maturesMs,
      nowMs: now,
    });
    await admin.from('ledger').insert({
      member_id: p.member_id,
      season_id: p.season_id,
      type: 'deposit_mature',
      amount: value,
      description: p.title ?? 'Vadeli mevduat',
      ref_type: 'position',
      ref_id: p.id,
    });
    await admin
      .from('positions')
      .update({ status: 'matured', closed_value: value, closed_at: nowISO })
      .eq('id', p.id);
    summary.matured++;
  }

  // ── 2. Settle listings past their window ────────────────────────────────
  const { data: listed } = await admin
    .from('positions')
    .select('*')
    .eq('status', 'listed')
    .lte('list_end', nowISO);

  const listedRows = listed ?? [];
  const quoteIds = [
    ...new Set(listedRows.map((p) => p.instrument_id).filter(Boolean) as string[]),
  ];
  const quotes = quoteIds.length ? await getPrices(quoteIds) : {};

  for (const p of listedRows) {
    const valued = valuePosition(p as Position, p.instrument_id ? quotes[p.instrument_id] : undefined, now);
    const value = Math.max(0, Math.round(valued.currentValue));
    await admin.from('ledger').insert({
      member_id: p.member_id,
      season_id: p.season_id,
      type: 'listing_settle',
      amount: value,
      description: p.title ?? 'İlan satışı',
      ref_type: 'position',
      ref_id: p.id,
    });
    await admin
      .from('positions')
      .update({ status: 'closed', closed_value: value, closed_at: nowISO })
      .eq('id', p.id);
    summary.settled++;
  }

  // ── 3. Daily real-estate rent (pay any unpaid elapsed days) ─────────────
  const { data: rentals } = await admin
    .from('positions')
    .select('*')
    .eq('status', 'open')
    .eq('type', 'real_estate')
    .not('rent_per_day', 'is', null);

  for (const p of rentals ?? []) {
    const rentPerDay = p.rent_per_day ?? 0;
    if (rentPerDay <= 0) continue;
    const openedMs = new Date(p.opened_at).getTime();
    const daysElapsed = Math.floor((now - openedMs) / 86_400_000);
    if (daysElapsed <= 0) continue;

    const { count } = await admin
      .from('ledger')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', p.member_id)
      .eq('type', 'rent')
      .eq('ref_id', p.id);
    const paidDays = count ?? 0;
    const dueDays = daysElapsed - paidDays;
    if (dueDays <= 0) continue;

    await admin.from('ledger').insert({
      member_id: p.member_id,
      season_id: p.season_id,
      type: 'rent',
      amount: rentPerDay * dueDays,
      description: `${p.title ?? 'Kira'} · ${dueDays} gün kira`,
      ref_type: 'position',
      ref_id: p.id,
    });
    summary.rentPaid++;
  }

  // ── 4. Liquidate wiped-out leveraged positions ──────────────────────────
  const { data: leveraged } = await admin
    .from('positions')
    .select('*')
    .eq('status', 'open')
    .in('type', MARKET_INSTRUMENTS);

  const levRows = leveraged ?? [];
  const levIds = [...new Set(levRows.map((p) => p.instrument_id).filter(Boolean) as string[])];
  const levQuotes = levIds.length ? await getPrices(levIds) : {};

  for (const p of levRows) {
    const valued = valuePosition(p as Position, p.instrument_id ? levQuotes[p.instrument_id] : undefined, now);
    if (valued.currentValue <= 0 || valued.liquidated) {
      await admin
        .from('positions')
        .update({ status: 'liquidated', closed_value: 0, closed_at: nowISO })
        .eq('id', p.id);
      summary.liquidated++;
    }
  }

  return summary;
}
