'use client';
import { CenterModal } from '../BottomSheet';
import { CoinRain } from '../CoinRain';
import { Coin } from '../Coin';
import { formatKLR } from '@/lib/money';

/** 4g — end-of-day reward moment with coin rain + base/streak breakdown. */
export function RewardModal({
  open,
  onCollect,
  base = 220,
  streakBonus = 26,
  streakDays = 13,
  multiplier = 1.26,
}: {
  open: boolean;
  onCollect: () => void;
  base?: number;
  streakBonus?: number;
  streakDays?: number;
  multiplier?: number;
}) {
  const total = base + streakBonus;
  const bonusPct = Math.round((multiplier - 1) * 100);
  return (
    <CenterModal open={open}>
      <CoinRain />
      <div
        className="relative z-10 rounded-[24px] text-center animate-klr-pop"
        style={{
          background: '#161122',
          border: '1px solid rgba(177,140,255,.3)',
          padding: '26px 22px',
          boxShadow: '0 24px 60px rgba(0,0,0,.5)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', color: 'rgba(240,236,246,.5)' }}>
          GÜN TAMAMLANDI 🎉
        </div>
        <div
          className="flex items-center justify-center gap-[10px] overflow-hidden"
          style={{ width: 150, height: 64, margin: '18px auto 0', borderRadius: 14, background: '#0D0A14', border: '1px solid rgba(242,193,78,.4)' }}
        >
          <Coin size={30} flip glow={false} />
          <span className="font-display tnum" style={{ fontSize: 30, fontWeight: 700, color: '#F2C14E' }}>
            +{formatKLR(total)}
          </span>
        </div>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: '#F2C14E', marginTop: 8 }}>
          KLR
        </div>
        <div
          style={{ borderTop: '1px dashed rgba(240,236,246,.15)', marginTop: 18, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <Row label="Temel ödül" value={`${formatKLR(base)} KLR`} />
          <Row label={`Streak bonusu (%${bonusPct})`} value={`+${formatKLR(streakBonus)} KLR`} accent />
          <Row label="Yarınki çarpan" value={`🔥${streakDays} · x${multiplier.toFixed(2).replace('.', ',')}`} accent />
        </div>
        <button
          type="button"
          onClick={onCollect}
          className="w-full flex items-center justify-center"
          style={{ height: 52, borderRadius: 15, background: '#B18CFF', color: '#14101F', fontSize: 15, fontWeight: 700, marginTop: 20 }}
        >
          Topla
        </button>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(240,236,246,.4)', marginTop: 10 }}>
          {streakDays} gün üst üste. Buzdolabın seninle gurur duyuyor.
        </div>
      </div>
    </CenterModal>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between" style={{ fontSize: 13, fontWeight: 600 }}>
      <span style={{ color: 'rgba(240,236,246,.55)' }}>{label}</span>
      <span className="font-display tnum" style={{ color: accent ? '#B18CFF' : '#F0ECF6' }}>
        {value}
      </span>
    </div>
  );
}
