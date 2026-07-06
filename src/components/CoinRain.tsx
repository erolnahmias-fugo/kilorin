import { Coin } from './Coin';

const DROPS = [
  { top: 120, left: '12%', size: 20, dur: '2.2s', delay: '0s' },
  { top: 110, left: '32%', size: 14, dur: '1.8s', delay: '.5s' },
  { top: 100, left: '58%', size: 22, dur: '2.5s', delay: '.9s' },
  { top: 130, left: '80%', size: 16, dur: '2s', delay: '1.4s' },
  { top: 90, left: '46%', size: 18, dur: '2.6s', delay: '.7s' },
  { top: 115, left: '68%', size: 15, dur: '2.1s', delay: '1.2s' },
];

/** Falling gold coins overlay for reward / casino-win moments. */
export function CoinRain({ z = 3 }: { z?: number }) {
  return (
    <>
      {DROPS.map((d, i) => (
        <div
          key={i}
          className="absolute animate-klr-fall"
          style={{ top: d.top, left: d.left, zIndex: z, animationDuration: d.dur, animationDelay: d.delay }}
        >
          <Coin size={d.size} glow={false} />
        </div>
      ))}
    </>
  );
}
