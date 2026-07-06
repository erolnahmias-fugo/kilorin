import {
  DAILY_REWARD_MAX,
  DAILY_REWARD_MIN,
  STREAK_CAP_DAYS,
  STREAK_STEP,
  SUSPICION_PENALTY,
} from './constants';
import type { RewardInput, RewardResult } from './types';

/** Streak multiplier = 1 + 0.02 × min(streakDays, 30). */
export function streakMultiplier(streakDays: number): number {
  return 1 + STREAK_STEP * Math.min(Math.max(0, streakDays), STREAK_CAP_DAYS);
}

/** Uniform integer base reward in [100, 300]. */
function rollBase(rng: () => number): number {
  return Math.floor(rng() * (DAILY_REWARD_MAX - DAILY_REWARD_MIN + 1)) + DAILY_REWARD_MIN;
}

/**
 * Resolves a day's close. `streakDays` is the streak BEFORE today.
 *  - target met (or cheat day): reward = base × multiplier, streak +1
 *  - missed with shield in inventory: shield consumed, streak preserved, no reward
 *  - missed without shield: streak → 0, no reward, no penalty
 * Suspicion badge shaves 10% off any positive earning.
 */
export function resolveDailyReward(input: RewardInput): RewardResult {
  const rng = input.rng ?? Math.random;
  const metTarget = input.cheatDay || input.totalKcal <= input.targetKcal;

  if (!metTarget) {
    if (input.hasShield) {
      return {
        metTarget: false,
        outcome: 'shielded',
        base: 0,
        streakBonus: 0,
        suspicionPenalty: 0,
        total: 0,
        newStreakDays: input.streakDays, // preserved, not incremented
        multiplier: streakMultiplier(input.streakDays),
        shieldConsumed: true,
      };
    }
    return {
      metTarget: false,
      outcome: 'broken',
      base: 0,
      streakBonus: 0,
      suspicionPenalty: 0,
      total: 0,
      newStreakDays: 0,
      multiplier: 1,
      shieldConsumed: false,
    };
  }

  const multiplier = streakMultiplier(input.streakDays);
  const base = rollBase(rng);
  const streakBonus = Math.round(base * (multiplier - 1));
  const gross = base + streakBonus;
  const suspicionPenalty = input.suspicious ? Math.round(gross * SUSPICION_PENALTY) : 0;
  const total = gross - suspicionPenalty;

  return {
    metTarget: true,
    outcome: 'reward',
    base,
    streakBonus,
    suspicionPenalty,
    total,
    newStreakDays: input.streakDays + 1,
    multiplier,
    shieldConsumed: false,
  };
}

/** Applies the suspicion penalty to an arbitrary positive earning (weigh-in, casino, etc.). */
export function applySuspicion(amount: number, suspicious: boolean): { net: number; penalty: number } {
  if (!suspicious || amount <= 0) return { net: amount, penalty: 0 };
  const penalty = Math.round(amount * SUSPICION_PENALTY);
  return { net: amount - penalty, penalty };
}
