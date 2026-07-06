import { CRYPTO_CATALOG, FX_CATALOG } from '../domain/market';
import type { OfferType } from '../domain/types';

export interface PriceQuote {
  instrumentId: string;
  /** KLR price per lot. */
  price: number;
  delayed: boolean;
  source: 'live' | 'cache' | 'sim';
  at: number;
}

const CACHE_TTL_MS = 90_000;
const cache = new Map<string, PriceQuote>();

/** Game-scaled base KLR price per lot, by instrument family. */
const GAME_BASE: Record<string, number> = { crypto: 4000, stock: 1500, fx: 1000, fund: 800 };

/** Approximate real-world reference used to normalize live quotes into game scale. */
const BASELINE: Record<string, number> = {
  bitcoin: 95000, ethereum: 3300, solana: 190, dogecoin: 0.38, cardano: 0.95,
  ripple: 2.3, chainlink: 22, 'avalanche-2': 38, pepe: 0.00002, 'shiba-inu': 0.000025,
  USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0067, CHF: 1.12,
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic smooth price factor around 1.0 — a sum of incommensurable sines
 * seeded per instrument so every server instance computes the same value at the
 * same instant, and it drifts continuously over time (no Math.random).
 */
function simFactor(instrumentId: string, nowMs: number): number {
  const seed = hashString(instrumentId);
  const phase = (seed % 1000) / 1000 * Math.PI * 2;
  const t = nowMs / 60000; // minutes
  const wave =
    0.55 * Math.sin(t / 47 + phase) +
    0.30 * Math.sin(t / 13 + phase * 1.7) +
    0.15 * Math.sin(t / 3.3 + phase * 2.3);
  const vol = 0.18;
  return Math.max(0.05, 1 + vol * wave);
}

function familyOf(instrumentId: string): OfferType {
  if (CRYPTO_CATALOG.some((c) => c.id === instrumentId)) return 'crypto';
  if (FX_CATALOG.some((c) => c.id === instrumentId)) return 'fx';
  return 'stock';
}

function simulate(instrumentId: string, nowMs: number): PriceQuote {
  const fam = familyOf(instrumentId);
  const base = GAME_BASE[fam] ?? 1000;
  return {
    instrumentId,
    price: Math.max(1, Math.round(base * simFactor(instrumentId, nowMs))),
    delayed: true,
    source: 'sim',
    at: nowMs,
  };
}

async function fetchLiveCrypto(ids: string[]): Promise<Record<string, number>> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`coingecko ${res.status}`);
  const json = (await res.json()) as Record<string, { usd: number }>;
  const out: Record<string, number> = {};
  for (const id of ids) if (json[id]?.usd != null) out[id] = json[id]!.usd;
  return out;
}

async function fetchLiveFx(symbols: string[]): Promise<Record<string, number>> {
  // Frankfurter: value of 1 unit of symbol in USD.
  const nonUsd = symbols.filter((s) => s !== 'USD');
  const out: Record<string, number> = { USD: 1 };
  if (nonUsd.length === 0) return out;
  const url = `https://api.frankfurter.app/latest?from=USD&to=${nonUsd.join(',')}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`frankfurter ${res.status}`);
  const json = (await res.json()) as { rates: Record<string, number> };
  for (const s of nonUsd) if (json.rates?.[s]) out[s] = 1 / json.rates[s]!; // USD per 1 unit
  return out;
}

function toQuote(instrumentId: string, live: number, nowMs: number): PriceQuote {
  const fam = familyOf(instrumentId);
  const base = GAME_BASE[fam] ?? 1000;
  const baseline = BASELINE[instrumentId] ?? live;
  return {
    instrumentId,
    price: Math.max(1, Math.round(base * (live / baseline))),
    delayed: false,
    source: 'live',
    at: nowMs,
  };
}

/**
 * Resolves KLR lot prices for a set of instruments. Live where possible
 * (crypto→CoinGecko, fx→Frankfurter), otherwise cached, otherwise simulated.
 * Never throws — a dead API degrades to `delayed` prices.
 */
export async function getPrices(instrumentIds: string[]): Promise<Record<string, PriceQuote>> {
  const now = Date.now();
  const result: Record<string, PriceQuote> = {};
  const need: string[] = [];

  for (const id of instrumentIds) {
    const c = cache.get(id);
    if (c && now - c.at < CACHE_TTL_MS) result[id] = { ...c, source: 'cache' };
    else need.push(id);
  }
  if (need.length === 0) return result;

  const cryptoIds = need.filter((id) => CRYPTO_CATALOG.some((c) => c.id === id));
  const fxIds = need.filter((id) => FX_CATALOG.some((c) => c.id === id));
  const others = need.filter((id) => !cryptoIds.includes(id) && !fxIds.includes(id));

  const [cryptoLive, fxLive] = await Promise.all([
    cryptoIds.length ? fetchLiveCrypto(cryptoIds).catch(() => ({}) as Record<string, number>) : Promise.resolve({}),
    fxIds.length ? fetchLiveFx(fxIds).catch(() => ({}) as Record<string, number>) : Promise.resolve({}),
  ]);

  const resolve = (id: string, liveMap: Record<string, number>) => {
    if (liveMap[id] != null) {
      const q = toQuote(id, liveMap[id]!, now);
      cache.set(id, q);
      result[id] = q;
    } else {
      const prev = cache.get(id);
      const q = prev ? { ...prev, source: 'cache' as const, delayed: true } : simulate(id, now);
      cache.set(id, q);
      result[id] = q;
    }
  };

  cryptoIds.forEach((id) => resolve(id, cryptoLive));
  fxIds.forEach((id) => resolve(id, fxLive));
  // Stocks/funds have no free key-less feed → always simulated.
  others.forEach((id) => {
    const q = simulate(id, now);
    cache.set(id, q);
    result[id] = q;
  });

  return result;
}

export async function getPrice(instrumentId: string): Promise<PriceQuote> {
  return (await getPrices([instrumentId]))[instrumentId]!;
}
