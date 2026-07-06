import { DateTime } from 'luxon';
import { ISTANBUL_TZ } from './domain/constants';

/** Current instant in the Istanbul zone. */
export function istanbulNow(): DateTime {
  return DateTime.now().setZone(ISTANBUL_TZ);
}

/** 'yyyy-MM-dd' for the given instant (or now) in Istanbul. */
export function istanbulDateStr(d?: Date | DateTime): string {
  const dt = d
    ? d instanceof Date
      ? DateTime.fromJSDate(d).setZone(ISTANBUL_TZ)
      : d.setZone(ISTANBUL_TZ)
    : istanbulNow();
  return dt.toFormat('yyyy-MM-dd');
}

/** Luxon weekday (1=Mon … 7=Sun) for a 'yyyy-MM-dd' string in Istanbul. */
export function weekdayOf(dateStr: string): number {
  return DateTime.fromISO(dateStr, { zone: ISTANBUL_TZ }).weekday;
}

/** Map short Turkish day codes used in season settings to Luxon weekday numbers. */
export const WEEKDAY_CODES: Record<string, number> = {
  Pzt: 1,
  Sal: 2,
  Çar: 3,
  Per: 4,
  Cum: 5,
  Cmt: 6,
  Paz: 7,
};

export function isWeighInDay(dateStr: string, weighDays: string[]): boolean {
  const wd = weekdayOf(dateStr);
  return weighDays.some((code) => WEEKDAY_CODES[code] === wd);
}

/** Instant at which the given Istanbul date closes (23:59:59 local). */
export function dayCloseInstant(dateStr: string): DateTime {
  return DateTime.fromISO(dateStr, { zone: ISTANBUL_TZ }).endOf('day');
}

/** Fraction (0→1) of a season elapsed by `now`. */
export function seasonFraction(startISO: string, weeks: number, now = istanbulNow()): number {
  const start = DateTime.fromISO(startISO, { zone: ISTANBUL_TZ });
  const end = start.plus({ weeks });
  const total = end.toMillis() - start.toMillis();
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now.toMillis() - start.toMillis()) / total));
}

/** HH:MM:SS countdown string from now to a target instant. */
export function countdown(toMs: number, fromMs = Date.now()): string {
  let s = Math.max(0, Math.floor((toMs - fromMs) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
