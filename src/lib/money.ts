const trFormatter = new Intl.NumberFormat('tr-TR');
const trDecimal = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 12480 → "12.480" (Turkish grouping, no currency symbol). */
export function formatKLR(n: number): string {
  return trFormatter.format(Math.round(n));
}

/** 84 → "84,0" — one decimal, Turkish comma (weights). */
export function formatKg(n: number): string {
  return trDecimal.format(n);
}

/** Signed percent, one decimal: 4.25 → "+%4,3", -38 → "−%38". */
export function formatPct(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  const abs = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(Math.abs(n));
  return `${sign}%${abs}`;
}
