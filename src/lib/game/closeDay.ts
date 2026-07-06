import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Tables } from '../supabase/database.types';
import { resolveDailyReward } from '../domain/rewards';

type Admin = SupabaseClient<Database>;
type Member = Tables<'season_members'>;

export interface DayCloseSummary {
  memberId: string;
  date: string;
  skipped: boolean;
  reason?: string;
  outcome?: 'reward' | 'shielded' | 'broken';
  totalKcal?: number;
  targetKcal?: number;
  base?: number;
  streakBonus?: number;
  suspicionPenalty?: number;
  total?: number;
  newStreakDays?: number;
  shieldConsumed?: boolean;
}

/**
 * Closes a single member's daily log for `dateStr` (Istanbul date):
 * sums meals, resolves the reward, writes split ledger rows (daily_reward +
 * streak_bonus, and a negative suspicion_penalty when flagged), advances the
 * streak, consumes a shield if used, and marks the log closed.
 * Idempotent — an already-closed or missing log is skipped.
 */
export async function closeMemberDay(admin: Admin, member: Member, dateStr: string): Promise<DayCloseSummary> {
  const { data: log } = await admin
    .from('daily_logs')
    .select('*')
    .eq('member_id', member.id)
    .eq('log_date', dateStr)
    .maybeSingle();

  if (!log) return { memberId: member.id, date: dateStr, skipped: true, reason: 'no_log' };
  if (log.closed) return { memberId: member.id, date: dateStr, skipped: true, reason: 'already_closed' };

  const totalKcal =
    (log.breakfast_kcal ?? 0) + (log.lunch_kcal ?? 0) + (log.dinner_kcal ?? 0) + (log.snack_kcal ?? 0);
  const targetKcal = member.daily_target_kcal ?? 0;

  const result = resolveDailyReward({
    totalKcal,
    targetKcal,
    streakDays: member.streak_days,
    hasShield: member.shield_inventory > 0,
    suspicious: member.suspicious,
    cheatDay: log.cheat_day,
  });

  // Ledger rows — split so the UI can show base vs streak bonus vs penalty.
  const rows: Database['public']['Tables']['ledger']['Insert'][] = [];
  if (result.base > 0) {
    rows.push({
      member_id: member.id,
      season_id: member.season_id,
      type: 'daily_reward',
      amount: result.base,
      description: 'Günlük ödül',
      ref_type: 'daily_log',
      ref_id: log.id,
    });
  }
  if (result.streakBonus > 0) {
    rows.push({
      member_id: member.id,
      season_id: member.season_id,
      type: 'streak_bonus',
      amount: result.streakBonus,
      description: `Seri bonusu (x${result.multiplier.toFixed(2)})`,
      ref_type: 'daily_log',
      ref_id: log.id,
    });
  }
  if (result.suspicionPenalty > 0) {
    rows.push({
      member_id: member.id,
      season_id: member.season_id,
      type: 'suspicion_penalty',
      amount: -result.suspicionPenalty,
      description: 'Şüphe cezası (-%10)',
      ref_type: 'daily_log',
      ref_id: log.id,
    });
  }
  if (rows.length) await admin.from('ledger').insert(rows);

  // Advance streak + consume shield.
  const memberUpdate: Database['public']['Tables']['season_members']['Update'] = {
    streak_days: result.newStreakDays,
  };
  if (result.shieldConsumed) {
    memberUpdate.shield_inventory = Math.max(0, member.shield_inventory - 1);
  }
  await admin.from('season_members').update(memberUpdate).eq('id', member.id);

  await admin.from('daily_logs').update({ closed: true }).eq('id', log.id);

  return {
    memberId: member.id,
    date: dateStr,
    skipped: false,
    outcome: result.outcome,
    totalKcal,
    targetKcal,
    base: result.base,
    streakBonus: result.streakBonus,
    suspicionPenalty: result.suspicionPenalty,
    total: result.total,
    newStreakDays: result.newStreakDays,
    shieldConsumed: result.shieldConsumed,
  };
}
