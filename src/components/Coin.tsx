import type { CSSProperties } from 'react';

/**
 * The gold KLR coin. Fixed gold gradient by design — intentionally theme-agnostic.
 * `flip` spins it (used in reward/casino moments), `glow` adds the ambient shadow.
 */
export function Coin({
  size = 38,
  flip = false,
  glow = true,
  className = '',
  style,
}: {
  size?: number;
  flip?: boolean;
  glow?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`${flip ? 'animate-klr-flip' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%,#FFE9A8,#F2C14E 55%,#B8860B)',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-space), system-ui, sans-serif',
        fontWeight: 800,
        fontSize: Math.round(size * 0.5),
        color: '#5C4300',
        boxShadow: glow ? `0 2px 12px rgba(184,134,11,.4)` : 'none',
        flex: 'none',
        ...style,
      }}
    >
      K
    </span>
  );
}
