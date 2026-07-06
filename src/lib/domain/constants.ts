/**
 * Central game-economy constants. Tuned so every yield-bearing instrument
 * shares one anchor: expected value of +10% per 24h locked.
 */

/** Everyone starts a season with this liquid balance. */
export const STARTING_BALANCE = 100;

/** 1 kg of body mass ≈ this many kcal. */
export const KCAL_PER_KG = 7700;

/** BMR floors below which the computed daily target is clamped + user warned. */
export const CALORIE_FLOOR = { female: 1200, male: 1500 } as const;

/** Mifflin-St Jeor activity multipliers the user picks from at onboarding. */
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Hareketsiz (masa başı)', factor: 1.2 },
  { id: 'light', label: 'Hafif (haftada 1-3 gün)', factor: 1.375 },
  { id: 'moderate', label: 'Orta (haftada 3-5 gün)', factor: 1.55 },
  { id: 'active', label: 'Aktif (haftada 6-7 gün)', factor: 1.725 },
  { id: 'very_active', label: 'Çok aktif (fiziksel iş)', factor: 1.9 },
] as const;
export type ActivityId = (typeof ACTIVITY_LEVELS)[number]['id'];

/** Daily reward when the calorie target is met: base uniform in this range. */
export const DAILY_REWARD_MIN = 100;
export const DAILY_REWARD_MAX = 300;

/** Streak multiplier = 1 + STREAK_STEP * min(streakDays, STREAK_CAP_DAYS). */
export const STREAK_STEP = 0.02;
export const STREAK_CAP_DAYS = 30;

/** Weigh-in tolerance: actual <= expected + this (kg) still earns the reward. */
export const WEIGH_IN_TOLERANCE_KG = 0.4;
export const WEIGH_IN_REWARD = 300;

/** Suspicion badge: real change worse than expected by more than this → flagged. */
export const SUSPICION_THRESHOLD_KG = 1.0;
/** Multiplicative penalty applied to ALL KLR earnings while badge is active. */
export const SUSPICION_PENALTY = 0.1; // -10%

/** The universal EV anchor: +10% expected return per 24h of lock. */
export const EV_24H = 0.1;

/** Leverage bands by market instrument family. */
export const LEVERAGE = {
  crypto: 3,
  stock: 2,
  fx: 1.3,
  fund: 1.2,
  interest: 1, // fixed-yield, no leverage
} as const;

/** Trap deposit variant probability + how far below anchor it pays. */
export const DEPOSIT_TRAP_PROBABILITY = 0.2;

/** Casino session durations (hours) and their max multiplier ceilings. */
export const CASINO_DURATIONS = [
  { hours: 1, maxMultiplier: 2 },
  { hours: 2, maxMultiplier: 4 },
  { hours: 3, maxMultiplier: 6 },
  { hours: 6, maxMultiplier: 10 },
] as const;
export type CasinoHours = (typeof CASINO_DURATIONS)[number]['hours'];

/** Shop economy. */
export const SHOP = {
  streakShield: { price: 400, maxInventory: 2 },
  cheatDay: { price: 1000, perWeek: 1 },
  dessertBomb: { price: 500, windowHours: 24, penaltyTransfer: 500, targetPenalty: 200 },
  aiAvatar: { price: 750 },
} as const;

/** Real-estate dynamic price band as a fraction of the buyer's net worth. */
export const REAL_ESTATE_PRICE_BAND = { min: 0.5, max: 0.8 } as const;
/** A listed property/asset sale settles this many hours after listing. */
export const LISTING_SETTLE_HOURS = 24;

export const ISTANBUL_TZ = 'Europe/Istanbul';
