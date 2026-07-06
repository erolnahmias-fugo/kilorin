import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';
import { SHOP } from '../domain/constants';
import { istanbulDateStr } from '../time';
import { notify } from './notify';

type Admin = SupabaseClient<Database>;

export interface BombSummary {
  fulfilled: number;
  exploded: number;
}

/**
 * Resolves dessert bombs whose 24h deadline has passed.
 *  - target logged a dessert in the window → bomb "fulfilled" (attacker's 500 is
 *    already burned; no further movement).
 *  - otherwise → "expired/exploded": transfer 500 from target to attacker via a
 *    pair of ledger rows, and notify both sides.
 */
export async function processDessertBombs(admin: Admin): Promise<BombSummary> {
  const nowISO = new Date().toISOString();
  const summary: BombSummary = { fulfilled: 0, exploded: 0 };

  const { data: bombs } = await admin
    .from('dessert_bombs')
    .select('*')
    .eq('status', 'pending')
    .lte('deadline', nowISO);

  const transfer = SHOP.dessertBomb.penaltyTransfer;

  for (const bomb of bombs ?? []) {
    const startDate = istanbulDateStr(new Date(bomb.created_at));
    const endDate = istanbulDateStr(new Date(bomb.deadline));

    const { data: dessertLog } = await admin
      .from('daily_logs')
      .select('id')
      .eq('member_id', bomb.target_member_id)
      .eq('is_dessert_log', true)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .limit(1)
      .maybeSingle();

    if (dessertLog) {
      await admin.from('dessert_bombs').update({ status: 'fulfilled' }).eq('id', bomb.id);
      summary.fulfilled++;
      await notify(
        admin,
        bomb.attacker_member_id,
        'dessert_bomb',
        'Tatlı bombası patladı!',
        'Hedefin tatlı yedi. Planın tuttu, ama 500 KLR yandı.',
        { bombId: bomb.id, outcome: 'fulfilled' },
      );
      continue;
    }

    // Target resisted → penalty transfer target → attacker.
    await admin.from('ledger').insert([
      {
        member_id: bomb.target_member_id,
        season_id: bomb.season_id,
        type: 'dessert_bomb_penalty',
        amount: -transfer,
        description: 'Tatlı bombasına direndin — ceza',
        ref_type: 'dessert_bomb',
        ref_id: bomb.id,
      },
      {
        member_id: bomb.attacker_member_id,
        season_id: bomb.season_id,
        type: 'dessert_bomb_penalty',
        amount: transfer,
        description: 'Tatlı bombası başarısız — tazminat',
        ref_type: 'dessert_bomb',
        ref_id: bomb.id,
      },
    ]);
    await admin.from('dessert_bombs').update({ status: 'expired' }).eq('id', bomb.id);
    summary.exploded++;

    await notify(
      admin,
      bomb.target_member_id,
      'dessert_bomb',
      'Tatlı bombasına direndin!',
      `Tatlı yemedin. ${transfer} KLR bombayı atana gitti.`,
      { bombId: bomb.id, outcome: 'expired' },
    );
    await notify(
      admin,
      bomb.attacker_member_id,
      'dessert_bomb',
      'Bomban boşa gitti',
      `Hedefin dayandı. ${transfer} KLR tazminat aldın.`,
      { bombId: bomb.id, outcome: 'expired' },
    );
  }

  return summary;
}
