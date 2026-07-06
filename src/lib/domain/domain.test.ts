import { describe, it, expect } from 'vitest';
import { computeCalorieTarget, mifflinStJeor, suggestSaferTarget } from './calories';
import { resolveDailyReward, streakMultiplier, applySuspicion } from './rewards';
import { depositRate, hourlyCarry, positionValue, generateShowcase } from './market';
import { rollCasino, casinoTargetEV, maxMultiplierFor } from './casino';
import { evaluateSuspicion } from './suspicion';
import { depositValue, netWorth, transformationScore } from './networth';
import { CALORIE_FLOOR, EV_24H, CASINO_DURATIONS } from './constants';

/** Deterministic RNG (mulberry32) for reproducible Monte-Carlo tests. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('calories', () => {
  it('Mifflin-St Jeor matches known reference values', () => {
    // Male 80kg, 180cm, 30y → 10*80+6.25*180-5*30+5 = 1780
    expect(mifflinStJeor('male', 80, 180, 30)).toBe(1780);
    // Female 60kg, 165cm, 30y → 600+1031.25-150-161 = 1320.25
    expect(mifflinStJeor('female', 60, 165, 30)).toBeCloseTo(1320.25, 2);
  });

  it('produces a sane daily target above the floor for a moderate goal', () => {
    const r = computeCalorieTarget({
      sex: 'male', age: 29, heightCm: 178, currentKg: 86.4, targetKg: 78,
      activityFactor: 1.375, seasonWeeks: 12,
    });
    expect(r.dailyTarget).toBeGreaterThanOrEqual(CALORIE_FLOOR.male);
    expect(r.clamped).toBe(false);
    expect(r.dailyTarget % 10).toBe(0);
  });

  it('clamps aggressive goals to the floor and flags them', () => {
    const r = computeCalorieTarget({
      sex: 'female', age: 25, heightCm: 160, currentKg: 62, targetKg: 48,
      activityFactor: 1.2, seasonWeeks: 8,
    });
    expect(r.clamped).toBe(true);
    expect(r.dailyTarget).toBe(CALORIE_FLOOR.female);
    const safer = suggestSaferTarget({
      sex: 'female', age: 25, heightCm: 160, currentKg: 62, targetKg: 48,
      activityFactor: 1.2, seasonWeeks: 8,
    });
    expect(safer).not.toBeNull();
    expect(safer!.targetKg).toBeGreaterThan(48);
  });
});

describe('rewards', () => {
  it('streak multiplier follows 1 + 0.02·min(days,30)', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(12)).toBeCloseTo(1.24, 5);
    expect(streakMultiplier(50)).toBeCloseTo(1.6, 5); // capped at 30
  });

  it('pays base × multiplier and increments streak when target met', () => {
    const r = resolveDailyReward({
      totalKcal: 1200, targetKcal: 1850, streakDays: 12,
      hasShield: false, suspicious: false, cheatDay: false, rng: () => 0.5,
    });
    expect(r.outcome).toBe('reward');
    expect(r.newStreakDays).toBe(13);
    expect(r.total).toBe(r.base + r.streakBonus);
    expect(r.streakBonus).toBe(Math.round(r.base * 0.24));
  });

  it('consumes a shield and preserves the streak on a miss', () => {
    const r = resolveDailyReward({
      totalKcal: 2500, targetKcal: 1850, streakDays: 12,
      hasShield: true, suspicious: false, cheatDay: false,
    });
    expect(r.outcome).toBe('shielded');
    expect(r.shieldConsumed).toBe(true);
    expect(r.newStreakDays).toBe(12);
    expect(r.total).toBe(0);
  });

  it('breaks the streak on a miss with no shield, without penalty', () => {
    const r = resolveDailyReward({
      totalKcal: 2500, targetKcal: 1850, streakDays: 12,
      hasShield: false, suspicious: false, cheatDay: false,
    });
    expect(r.outcome).toBe('broken');
    expect(r.newStreakDays).toBe(0);
  });

  it('shaves 10% off earnings when suspicious', () => {
    const r = resolveDailyReward({
      totalKcal: 1200, targetKcal: 1850, streakDays: 0,
      hasShield: false, suspicious: true, cheatDay: false, rng: () => 0,
    });
    // base 100, no streak bonus, penalty 10
    expect(r.base).toBe(100);
    expect(r.suspicionPenalty).toBe(10);
    expect(r.total).toBe(90);
    expect(applySuspicion(300, true)).toEqual({ net: 270, penalty: 30 });
  });
});

describe('market yield anchor', () => {
  it('standard deposit pays ~10% per 24h, trap pays far less', () => {
    expect(depositRate(24, false)).toBeCloseTo(0.1, 5);
    expect(depositRate(72, false)).toBeGreaterThan(0.3); // mild term premium
    expect(depositRate(48, true)).toBeLessThan(depositRate(48, false) * 0.5);
  });

  it('leveraged position EV over 24h is ~+10% with zero-drift price', () => {
    const entry = 1000;
    // carry alone (price flat) after 24h:
    const flat = positionValue({ entryKlr: entry, leverage: 3, entryPrice: 100, currentPrice: 100, hoursHeld: 24 });
    expect(flat.value).toBeCloseTo(entry * (1 + EV_24H), -1);
    expect(hourlyCarry(entry) * 24).toBeCloseTo(entry * EV_24H, 5);
  });

  it('position liquidates at 0 and never goes negative', () => {
    const p = positionValue({ entryKlr: 1000, leverage: 3, entryPrice: 100, currentPrice: 50, hoursHeld: 0 });
    expect(p.value).toBe(0);
    expect(p.liquidated).toBe(true);
  });

  it('generates 2–5 offers with at least one yield/market instrument', () => {
    for (let s = 1; s < 40; s++) {
      const offers = generateShowcase(rng(s), 12000);
      expect(offers.length).toBeGreaterThanOrEqual(2);
      expect(offers.some((o) => ['interest', 'crypto', 'stock', 'fx', 'fund'].includes(o.type))).toBe(true);
    }
  });
});

describe('casino', () => {
  it('empirical EV matches the duration-scaled anchor within tolerance', () => {
    for (const { hours } of CASINO_DURATIONS) {
      const r = rng(hours * 7 + 1);
      const N = 60000;
      let sum = 0;
      let max = 0;
      for (let i = 0; i < N; i++) {
        const roll = rollCasino(hours as 1 | 2 | 3 | 6, r);
        sum += roll.multiplier;
        max = Math.max(max, roll.multiplier);
      }
      const empiricalEV = sum / N;
      expect(empiricalEV).toBeCloseTo(casinoTargetEV(hours), 1);
      expect(max).toBeLessThanOrEqual(maxMultiplierFor(hours as 1 | 2 | 3 | 6));
    }
  });
});

describe('suspicion & net worth', () => {
  it('flags when real loss falls >1kg short of the declared deficit', () => {
    // declared deficit implies ~2kg loss, actual only 0.5kg → gap 1.5 → flagged
    const r = evaluateSuspicion({
      prevWeightKg: 85, currWeightKg: 84.5,
      sumMaintenanceKcal: 2500 * 7, sumConsumedKcal: 500 * 7,
    });
    expect(r.suspicious).toBe(true);
  });

  it('clears when the weigh-in is consistent', () => {
    const r = evaluateSuspicion({
      prevWeightKg: 85, currWeightKg: 83,
      sumMaintenanceKcal: 2500 * 7, sumConsumedKcal: 2000 * 7,
    });
    expect(r.suspicious).toBe(false);
  });

  it('accrues deposit value linearly to maturity', () => {
    const v = depositValue({
      principal: 1000, rate: 0.1,
      openedAtMs: 0, maturesAtMs: 24 * 3600 * 1000, nowMs: 12 * 3600 * 1000,
    });
    expect(v).toBe(1050);
  });

  it('sums net worth and scores transformation', () => {
    expect(netWorth({ liquid: 12480, deposits: 590, positions: 2148, prestige: 3200 })).toBe(18418);
    expect(transformationScore(86.4, 84, 78)).toBeCloseTo(2.4 / 8.4, 5);
  });
});
