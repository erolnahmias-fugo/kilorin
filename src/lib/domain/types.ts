export type Sex = 'male' | 'female';

export type OfferType =
  | 'interest' // vadeli mevduat
  | 'crypto'
  | 'stock'
  | 'fx' // döviz
  | 'fund' // fon
  | 'real_estate'
  | 'car'
  | 'watch';

export type PositionStatus = 'open' | 'closed' | 'liquidated' | 'listed' | 'matured';

export type CasinoStatus = 'active' | 'revealed' | 'collected';

export type LedgerType =
  | 'season_start' // +100 KLR
  | 'daily_reward'
  | 'streak_bonus'
  | 'weigh_in_reward'
  | 'weigh_in_reversal' // admin rejects photo
  | 'market_buy'
  | 'market_sell'
  | 'deposit_open'
  | 'deposit_mature'
  | 'casino_stake'
  | 'casino_payout'
  | 'shop_purchase'
  | 'dessert_bomb_stake'
  | 'dessert_bomb_penalty' // victim -> attacker transfer (both sides)
  | 'listing_settle'
  | 'rent' // daily real-estate rent income
  | 'suspicion_penalty'
  | 'admin_adjust';

/** Instrument families that behave with the carry+leverage price model. */
export const MARKET_INSTRUMENTS: OfferType[] = ['crypto', 'stock', 'fx', 'fund'];

/** Instruments displayed/held as prestige (cosmetic on profile). */
export const PRESTIGE_INSTRUMENTS: OfferType[] = ['car', 'watch'];

export interface CalorieTargetInput {
  sex: Sex;
  age: number;
  heightCm: number;
  currentKg: number;
  targetKg: number;
  activityFactor: number;
  seasonWeeks: number;
}

export interface CalorieTargetResult {
  bmr: number;
  tdee: number;
  /** Daily deficit needed to reach target by season end (kcal, positive number). */
  requiredDeficit: number;
  /** The daily target before clamping to the floor. */
  rawTarget: number;
  /** The daily target actually used (>= floor). */
  dailyTarget: number;
  /** Floor that applies to this user's sex. */
  floor: number;
  /** True when rawTarget < floor and we clamped up — the "aggressive goal" warning. */
  clamped: boolean;
  /** Estimated weekly loss (kg) at the *used* target. */
  estWeeklyLossKg: number;
  /** Estimated end-of-season weight (kg) at the *used* target. */
  estEndKg: number;
}

export interface RewardInput {
  totalKcal: number;
  targetKcal: number;
  streakDays: number; // streak BEFORE today's close
  hasShield: boolean;
  suspicious: boolean;
  cheatDay: boolean;
  rng?: () => number;
}

export interface RewardResult {
  metTarget: boolean;
  /** 'reward' | 'shielded' | 'broken' */
  outcome: 'reward' | 'shielded' | 'broken';
  base: number;
  streakBonus: number;
  suspicionPenalty: number;
  total: number;
  newStreakDays: number;
  multiplier: number;
  shieldConsumed: boolean;
}
