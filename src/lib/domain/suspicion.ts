import { KCAL_PER_KG, SUSPICION_THRESHOLD_KG } from './constants';

export interface SuspicionInput {
  prevWeightKg: number;
  currWeightKg: number;
  /** Σ maintenance (TDEE) over the days between the two weigh-ins. */
  sumMaintenanceKcal: number;
  /** Σ consumed kcal declared in daily logs over the same days. */
  sumConsumedKcal: number;
}

export interface SuspicionResult {
  expectedLossKg: number;
  actualLossKg: number;
  /** expectedLoss − actualLoss; positive means "lost less than declared intake implies". */
  gapKg: number;
  suspicious: boolean;
}

/**
 * Cross-checks declared eating against real weight change.
 * If the real loss falls short of the declared-deficit expectation by more than
 * 1.0 kg, the badge goes on. A consistent weigh-in (gap ≤ threshold) clears it.
 */
export function evaluateSuspicion(input: SuspicionInput): SuspicionResult {
  const declaredDeficit = input.sumMaintenanceKcal - input.sumConsumedKcal;
  const expectedLossKg = declaredDeficit / KCAL_PER_KG;
  const actualLossKg = input.prevWeightKg - input.currWeightKg;
  const gapKg = expectedLossKg - actualLossKg;
  return {
    expectedLossKg: Math.round(expectedLossKg * 100) / 100,
    actualLossKg: Math.round(actualLossKg * 100) / 100,
    gapKg: Math.round(gapKg * 100) / 100,
    suspicious: gapKg > SUSPICION_THRESHOLD_KG,
  };
}

/** Linear expected weight at a given fraction (0→1) of the season. */
export function expectedWeight(startKg: number, targetKg: number, fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  return Math.round((startKg + (targetKg - startKg) * f) * 10) / 10;
}
