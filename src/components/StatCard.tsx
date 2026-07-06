import type { ReactNode } from 'react';

/** Small labeled surface card: uppercase label + big display value. */
export function StatCard({
  label,
  children,
  accent = false,
  className = '',
}: {
  label: string;
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface rounded-[16px] shadow-card ${accent ? 'border-[1.5px] border-accent' : 'border border-border'} ${className}`}
      style={{ padding: '13px 15px' }}
    >
      <div
        className={accent ? 'text-accent' : 'text-t45'}
        style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em' }}
      >
        {label}
      </div>
      <div className={`font-display tnum ${accent ? 'text-accent' : ''}`} style={{ fontSize: 22, fontWeight: 700, marginTop: 5 }}>
        {children}
      </div>
    </div>
  );
}
