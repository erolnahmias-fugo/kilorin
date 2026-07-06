import { CASINO_DURATIONS, EV_24H, type CasinoHours } from './constants';

/** Expected payout multiplier for a stake locked `hours` (anchored to +10%/24h). */
export function casinoTargetEV(hours: number): number {
  return 1 + EV_24H * (hours / 24);
}

export function maxMultiplierFor(hours: CasinoHours): number {
  const d = CASINO_DURATIONS.find((c) => c.hours === hours);
  return d ? d.maxMultiplier : 2;
}

/**
 * The distribution is multiplier = maxMult · U^a with U~Uniform(0,1).
 *   E[multiplier] = maxMult / (a + 1)   ⇒   a = maxMult / targetEV − 1.
 * This gives an exact EV, a hard [0, maxMult] range, and a heavy tail that gets
 * heavier as the ceiling rises (6h ⇒ mostly near-zero with a rare 10× jackpot).
 */
export function casinoExponent(hours: CasinoHours): number {
  const maxMult = maxMultiplierFor(hours);
  const target = casinoTargetEV(hours);
  return Math.max(0.01, maxMult / target - 1);
}

export interface CasinoRoll {
  hours: CasinoHours;
  multiplier: number; // rounded to 0.1
  maxMultiplier: number;
  targetEV: number;
  /** Fraction of outcomes that would land at or above this one (for "%N'lik dilim"). */
  percentile: number;
}

/** Resolves a casino session. Only ever called server-side at reveal time. */
export function rollCasino(hours: CasinoHours, rng: () => number = Math.random): CasinoRoll {
  const maxMult = maxMultiplierFor(hours);
  const a = casinoExponent(hours);
  const u = rng();
  const raw = maxMult * Math.pow(u, a);
  const multiplier = Math.round(raw * 10) / 10;
  // P(X >= raw) = 1 - (raw/maxMult)^(1/a) = 1 - u.
  const percentile = Math.round((1 - u) * 100);
  return {
    hours,
    multiplier,
    maxMultiplier: maxMult,
    targetEV: casinoTargetEV(hours),
    percentile: Math.max(1, percentile),
  };
}

/** Payout in KLR from a stake and resolved multiplier. */
export function casinoPayout(stake: number, multiplier: number): number {
  return Math.round(stake * multiplier);
}
