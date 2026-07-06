'use client';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { countdown } from '@/lib/time';

/** Live HH:MM:SS countdown to a target instant. Renders "00:00:00" once elapsed. */
export function Countdown({
  to,
  className = '',
  withDays = false,
  style,
}: {
  /** Target instant as ISO string or epoch ms. */
  to: string | number;
  className?: string;
  /** Prefix with "Ng " when more than 24h remain (e.g. "1g 04:12"). */
  withDays?: boolean;
  style?: CSSProperties;
}) {
  const toMs = typeof to === 'number' ? to : Date.parse(to);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  let label: string;
  if (withDays) {
    const totalSec = Math.max(0, Math.floor((toMs - now) / 1000));
    const days = Math.floor(totalSec / 86400);
    label = days > 0 ? `${days}g ${countdown(toMs, now + days * 86400000)}` : countdown(toMs, now);
  } else {
    label = countdown(toMs, now);
  }

  return (
    <span className={`font-display tnum ${className}`} style={style} suppressHydrationWarning>
      {label}
    </span>
  );
}
