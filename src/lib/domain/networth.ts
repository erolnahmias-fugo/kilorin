/** Accrued value of a fixed-term deposit, interpolated linearly to maturity. */
export function depositValue(params: {
  principal: number;
  rate: number;
  openedAtMs: number;
  maturesAtMs: number;
  nowMs: number;
}): number {
  const { principal, rate, openedAtMs, maturesAtMs, nowMs } = params;
  const total = Math.max(1, maturesAtMs - openedAtMs);
  const elapsed = Math.min(total, Math.max(0, nowMs - openedAtMs));
  const frac = elapsed / total;
  return Math.round(principal * (1 + rate * frac));
}

export interface NetWorthParts {
  /** Liquid KLR derived from the ledger. */
  liquid: number;
  /** Σ current value of open fixed deposits (principal + accrual). */
  deposits: number;
  /** Σ mark-to-market value of open market positions. */
  positions: number;
  /** Σ current value of real-estate / prestige holdings. */
  prestige: number;
}

export function netWorth(parts: NetWorthParts): number {
  return Math.round(parts.liquid + parts.deposits + parts.positions + parts.prestige);
}

/** Dönüşüm Şampiyonu score: fraction of the planned loss actually achieved. */
export function transformationScore(startKg: number, endKg: number, targetKg: number): number {
  const planned = startKg - targetKg;
  if (planned <= 0) return 0;
  return (startKg - endKg) / planned;
}
