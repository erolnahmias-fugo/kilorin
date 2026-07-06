import { CALORIE_FLOOR, KCAL_PER_KG } from './constants';
import type { CalorieTargetInput, CalorieTargetResult } from './types';

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function mifflinStJeor(sex: 'male' | 'female', kg: number, cm: number, age: number): number {
  const base = 10 * kg + 6.25 * cm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Full onboarding calorie calculation:
 * BMR → TDEE → deficit needed to hit target by season end → daily target,
 * clamped to a sex-specific floor (below which we warn the user).
 */
export function computeCalorieTarget(input: CalorieTargetInput): CalorieTargetResult {
  const { sex, age, heightCm, currentKg, targetKg, activityFactor, seasonWeeks } = input;

  const bmr = mifflinStJeor(sex, currentKg, heightCm, age);
  const tdee = bmr * activityFactor;

  const days = Math.max(1, Math.round(seasonWeeks * 7));
  const kgToLose = Math.max(0, currentKg - targetKg);
  const totalDeficit = kgToLose * KCAL_PER_KG;
  const requiredDeficit = totalDeficit / days;

  const rawTarget = tdee - requiredDeficit;
  const floor = CALORIE_FLOOR[sex];
  const clamped = rawTarget < floor;
  const dailyTargetExact = Math.max(rawTarget, floor);
  const dailyTarget = roundTo(dailyTargetExact, 10);

  // Recompute realized loss at the (possibly clamped) target actually used.
  const dailyDeficitUsed = Math.max(0, tdee - dailyTarget);
  const estWeeklyLossKg = (dailyDeficitUsed * 7) / KCAL_PER_KG;
  const estEndKg = currentKg - (dailyDeficitUsed * days) / KCAL_PER_KG;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    requiredDeficit: Math.round(requiredDeficit),
    rawTarget: Math.round(rawTarget),
    dailyTarget,
    floor,
    clamped,
    estWeeklyLossKg: Math.round(estWeeklyLossKg * 100) / 100,
    estEndKg: Math.round(estEndKg * 10) / 10,
  };
}

/**
 * Suggests a *less aggressive* target weight so the daily calorie target sits at
 * (or just above) the floor — used to power the "bu hedef fazla agresif" screen.
 * Returns null when the requested target already respects the floor.
 */
export function suggestSaferTarget(input: CalorieTargetInput): { targetKg: number; dailyTarget: number } | null {
  const result = computeCalorieTarget(input);
  if (!result.clamped) return null;

  const bmr = mifflinStJeor(input.sex, input.currentKg, input.heightCm, input.age);
  const tdee = bmr * input.activityFactor;
  const days = Math.max(1, Math.round(input.seasonWeeks * 7));
  const floor = CALORIE_FLOOR[input.sex];

  // Max sustainable deficit = TDEE - floor; over the season that caps the loss.
  const maxDailyDeficit = Math.max(0, tdee - floor);
  const maxLossKg = (maxDailyDeficit * days) / KCAL_PER_KG;
  const saferTargetKg = Math.round((input.currentKg - maxLossKg) * 10) / 10;

  const recomputed = computeCalorieTarget({ ...input, targetKg: saferTargetKg });
  return { targetKg: saferTargetKg, dailyTarget: recomputed.dailyTarget };
}
