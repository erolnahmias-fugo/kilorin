/** Rounded track + gradient fill. `pct` is 0–100 (clamped). */
export function ProgressBar({
  pct,
  height = 10,
  className = '',
}: {
  pct: number;
  height?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={`rounded-full bg-track overflow-hidden ${className}`}
      style={{ height }}
    >
      <div className="h-full rounded-full bg-grad" style={{ width: `${clamped}%` }} />
    </div>
  );
}
