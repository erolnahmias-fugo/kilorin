import {
  DEPOSIT_TRAP_PROBABILITY,
  EV_24H,
  LEVERAGE,
  REAL_ESTATE_PRICE_BAND,
} from './constants';
import type { OfferType } from './types';

/* ─────────────────────────── instrument catalogs ───────────────────────────
 * Crypto ids are real CoinGecko ids so the price proxy can resolve them live;
 * when the API is unreachable the proxy falls back to a seeded random walk.
 */
export const CRYPTO_CATALOG = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'pepe', symbol: 'PEPE', name: 'Pepe' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
] as const;

export const FX_CATALOG = [
  { id: 'USD', symbol: 'USD', name: 'Dolar' },
  { id: 'EUR', symbol: 'EUR', name: 'Euro' },
  { id: 'GBP', symbol: 'GBP', name: 'Sterlin' },
  { id: 'JPY', symbol: 'JPY', name: 'Yen' },
  { id: 'CHF', symbol: 'CHF', name: 'Frank' },
] as const;

export const STOCK_CATALOG = [
  { id: 'AAPL', symbol: 'AAPL', name: 'Apple' },
  { id: 'TSLA', symbol: 'TSLA', name: 'Tesla' },
  { id: 'NVDA', symbol: 'NVDA', name: 'Nvidia' },
  { id: 'THYAO', symbol: 'THYAO', name: 'Türk Hava Yolları' },
  { id: 'BIMAS', symbol: 'BIMAS', name: 'BİM' },
] as const;

export const FUND_CATALOG = [
  { id: 'AFT', symbol: 'AFT', name: 'Teknoloji Fonu' },
  { id: 'IPB', symbol: 'IPB', name: 'Endeks Fonu' },
  { id: 'GAF', symbol: 'GAF', name: 'Altın Fonu' },
] as const;

export const REAL_ESTATE_CATALOG = [
  { name: 'Stüdyo Daire', rentPerDay: 90 },
  { name: 'Bahçeli Villa', rentPerDay: 240 },
  { name: 'Deniz Manzaralı Rezidans', rentPerDay: 160 },
  { name: 'Şehir Merkezi 2+1', rentPerDay: 120 },
] as const;

export const PRESTIGE_CATALOG: { type: 'car' | 'watch'; name: string; basePrice: number }[] = [
  { type: 'watch', name: 'Kolex Daytona', basePrice: 3200 },
  { type: 'watch', name: 'Patep Nautilus', basePrice: 5200 },
  { type: 'car', name: 'Cayenne S', basePrice: 8800 },
  { type: 'car', name: 'M4 Competition', basePrice: 7400 },
];

/* ─────────────────────────── yield anchor helpers ─────────────────────────── */

/**
 * Fixed-deposit yield for a lock of `hours`. Anchor is +10%/24h with a mild
 * term premium so longer locks pay slightly super-linearly (24h→10%, 72h→~33%).
 * Trap variants pay well below the anchor and are visually indistinguishable.
 */
export function depositRate(hours: number, trap: boolean): number {
  if (trap) {
    // Clearly below anchor: ~30% of fair.
    return round4((EV_24H * (hours / 24)) * 0.3);
  }
  const linear = EV_24H * (hours / 24);
  const termPremium = 0.01 * Math.max(0, hours / 24 - 1); // +1%/extra day
  return round4(linear + termPremium);
}

/** Per-hour KLR carry that makes a leveraged position's EV hit +10%/24h. */
export function hourlyCarry(entryKlr: number): number {
  return (entryKlr * EV_24H) / 24;
}

/**
 * Mark-to-market value of a leveraged position.
 * value = entry × (1 + leverage × priceChangePct) + carry × hoursHeld, floored at 0.
 */
export function positionValue(params: {
  entryKlr: number;
  leverage: number;
  entryPrice: number;
  currentPrice: number;
  hoursHeld: number;
}): { value: number; pnlPct: number; liquidated: boolean } {
  const { entryKlr, leverage, entryPrice, currentPrice, hoursHeld } = params;
  const pct = entryPrice > 0 ? (currentPrice - entryPrice) / entryPrice : 0;
  const carry = hourlyCarry(entryKlr) * Math.max(0, hoursHeld);
  const raw = entryKlr * (1 + leverage * pct) + carry;
  const value = Math.max(0, raw);
  return {
    value: Math.round(value),
    pnlPct: Math.round((value / entryKlr - 1) * 1000) / 10,
    liquidated: value <= 0,
  };
}

export function leverageFor(type: OfferType): number {
  switch (type) {
    case 'crypto':
      return LEVERAGE.crypto;
    case 'stock':
      return LEVERAGE.stock;
    case 'fx':
      return LEVERAGE.fx;
    case 'fund':
      return LEVERAGE.fund;
    default:
      return LEVERAGE.interest;
  }
}

/* ─────────────────────────── offer generation ─────────────────────────── */

export interface OfferDraft {
  type: OfferType;
  title: string;
  subtitle: string;
  /** Instrument id the price proxy understands (crypto/fx/stock/fund). */
  instrumentId?: string;
  symbol?: string;
  /** Fixed-deposit terms. */
  lockHours?: number;
  rate?: number;
  isTrap?: boolean;
  leverage?: number;
  /** Lot / unit price in KLR (0 for market instruments priced live per lot). */
  pricePerLot: number;
  /** Remaining stock (lots / units). null = unlimited (deposits). */
  stock: number | null;
  minStake?: number;
  rentPerDay?: number;
  terms: Record<string, unknown>;
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function interestDraft(rng: () => number): OfferDraft {
  const hours = pick([24, 48, 72], rng);
  const trap = rng() < DEPOSIT_TRAP_PROBABILITY;
  const rate = depositRate(hours, trap);
  const days = Math.round(hours / 24);
  return {
    type: 'interest',
    title: 'Vadeli Mevduat',
    subtitle: `${days} gün kilitli · erken çekimde faiz yanar`,
    lockHours: hours,
    rate,
    isTrap: trap,
    pricePerLot: 0,
    stock: null,
    minStake: 500,
    terms: { hours, rate },
  };
}

function marketDraft(type: OfferType, rng: () => number): OfferDraft {
  const catalog: readonly { id: string; symbol: string; name: string }[] =
    type === 'crypto'
      ? CRYPTO_CATALOG
      : type === 'fx'
        ? FX_CATALOG
        : type === 'stock'
          ? STOCK_CATALOG
          : FUND_CATALOG;
  const inst = pick(catalog, rng);
  const leverage = leverageFor(type);
  return {
    type,
    title: inst.name,
    subtitle: `Canlı fiyat · kaldıraç x${leverage} · istediğin an sat`,
    instrumentId: inst.id,
    symbol: inst.symbol,
    leverage,
    pricePerLot: 0, // priced live per lot at purchase
    stock: randInt(rng, 3, 12),
    terms: { instrumentId: inst.id, symbol: inst.symbol, leverage },
  };
}

function realEstateDraft(rng: () => number, netWorth: number): OfferDraft {
  const prop = pick(REAL_ESTATE_CATALOG, rng);
  const frac =
    REAL_ESTATE_PRICE_BAND.min + rng() * (REAL_ESTATE_PRICE_BAND.max - REAL_ESTATE_PRICE_BAND.min);
  const price = Math.max(2000, Math.round((netWorth * frac) / 100) * 100);
  return {
    type: 'real_estate',
    title: prop.name,
    subtitle: `Kira geliri ${prop.rentPerDay} KLR/gün · satışı 24 saat sürer`,
    pricePerLot: price,
    stock: 1,
    rentPerDay: prop.rentPerDay,
    terms: { rentPerDay: prop.rentPerDay },
  };
}

function prestigeDraft(rng: () => number): OfferDraft {
  const item = pick(PRESTIGE_CATALOG, rng);
  const price = Math.round((item.basePrice * (0.9 + rng() * 0.2)) / 100) * 100;
  return {
    type: item.type,
    title: item.name,
    subtitle: 'Prestij varlık · profilde sergilenir',
    pricePerLot: price,
    stock: 1,
    terms: {},
  };
}

/**
 * Generates a fresh showcase of 2–5 offers: always a couple of yield/market
 * instruments, sometimes a prestige or real-estate piece. `netWorth` scales the
 * real-estate price band.
 */
export function generateShowcase(rng: () => number = Math.random, netWorth = 10000): OfferDraft[] {
  const count = randInt(rng, 2, 5);
  const drafts: OfferDraft[] = [];
  const marketTypes: OfferType[] = ['crypto', 'stock', 'fx', 'fund'];

  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (roll < 0.3) drafts.push(interestDraft(rng));
    else if (roll < 0.75) drafts.push(marketDraft(pick(marketTypes, rng), rng));
    else if (roll < 0.9) drafts.push(prestigeDraft(rng));
    else drafts.push(realEstateDraft(rng, netWorth));
  }

  // Guarantee at least one yield/market instrument in the showcase.
  if (!drafts.some((d) => d.type === 'interest' || marketTypes.includes(d.type))) {
    drafts.push(marketDraft('crypto', rng));
  }
  return drafts;
}
