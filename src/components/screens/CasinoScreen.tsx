'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coin } from '../Coin';
import { CoinRain } from '../CoinRain';
import { postApi } from '../api';
import { formatKLR } from '@/lib/money';
import { countdown } from '@/lib/time';
import { CASINO_DURATIONS, type CasinoHours } from '@/lib/domain/constants';

const NEON = '#C86AF5';
const GOLD = '#F2C14E';
const TEXT = '#F4ECFA';
const DUR_LABEL: Record<number, string> = { 1: '0x – 2x', 2: '0x – 4x', 3: '0x – 6x', 6: '0x – 10x 💀' };
const AMOUNTS = [100, 500, 1000];

type Phase = 'setup' | 'active' | 'reveal';

export function CasinoScreen({ balance }: { balance: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('setup');
  const [stake, setStake] = useState(1000);
  const [allIn, setAllIn] = useState(false);
  const [hours, setHours] = useState<CasinoHours>(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [endMs, setEndMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<{ multiplier: number; payout: number; percentile: number } | null>(null);

  const effectiveStake = allIn ? balance : stake;
  const maxMult = CASINO_DURATIONS.find((d) => d.hours === hours)?.maxMultiplier ?? 6;

  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const remainingMs = Math.max(0, endMs - now);
  const elapsedFrac = totalMs > 0 ? Math.min(1, (totalMs - remainingMs) / totalMs) : 0;
  const timeUp = phase === 'active' && remainingMs <= 0;

  async function sit() {
    setBusy(true);
    setError(null);
    const res = await postApi<{ sessionId: string }>('/api/casino/sit', { stake: effectiveStake, hours });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSessionId(res.data.sessionId);
    setTotalMs(hours * 3600_000);
    setEndMs(Date.now() + hours * 3600_000);
    setNow(Date.now());
    setPhase('active');
  }

  async function reveal() {
    setBusy(true);
    const res = await postApi<{ multiplier: number; payout: number; percentile: number }>('/api/casino/reveal', { sessionId });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res.data);
    setPhase('reveal');
  }

  const bg =
    phase === 'reveal'
      ? 'radial-gradient(ellipse at 50% 35%,#2a1338 0%,#0A0612 65%)'
      : phase === 'active'
        ? 'radial-gradient(ellipse at 50% 30%,#1c0e26 0%,#0A0612 60%)'
        : 'radial-gradient(ellipse at 50% 0%,#1c0e26 0%,#0A0612 55%)';

  return (
    <div className="casino-root app-shell" style={{ background: bg, color: TEXT, fontFamily: 'var(--font-manrope), sans-serif', position: 'relative', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => router.push('/')}
        style={{ position: 'absolute', top: 20, left: 18, zIndex: 5, color: 'rgba(244,236,250,.6)', fontSize: 13, fontWeight: 600 }}
      >
        ← Çık
      </button>

      {phase === 'setup' && (
        <div className="flex-1 flex flex-col" style={{ padding: '78px 22px 0', overflow: 'hidden' }}>
          <div className="text-center">
            <div className="font-display animate-klr-neon" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '.24em', color: NEON }}>KUMARHANE</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(244,236,250,.5)', marginTop: 6 }}>Kasa her zaman kazanır 😏 · Kalori 18+</div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(244,236,250,.45)' }}>MİKTAR</div>
            <div className="flex gap-2" style={{ marginTop: 10 }}>
              {AMOUNTS.map((a) => {
                const active = !allIn && stake === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setStake(a); setAllIn(false); }}
                    className="font-display flex-1 flex items-center justify-center"
                    style={{ height: 44, borderRadius: 12, fontSize: 13, fontWeight: 700, ...neonBox(active) }}
                  >
                    {formatKLR(a)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAllIn(true)}
                className="font-display flex-1 flex items-center justify-center"
                style={{ height: 44, borderRadius: 12, fontSize: 12, fontWeight: 700, ...neonBox(allIn) }}
              >
                HEPSİ 🫣
              </button>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(244,236,250,.45)' }}>MASADA KALMA SÜRESİ</div>
            <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10 }}>
              {CASINO_DURATIONS.map((d) => {
                const active = hours === d.hours;
                return (
                  <button
                    key={d.hours}
                    type="button"
                    onClick={() => setHours(d.hours)}
                    className="text-left"
                    style={{ padding: '12px 14px', borderRadius: 14, ...neonBox(active) }}
                  >
                    <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: active ? NEON : TEXT }}>{d.hours} saat</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(244,236,250,.55)' }}>{DUR_LABEL[d.hours]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 22, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(244,236,250,.1)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, fontWeight: 600 }}>
            <SumRow label="Masaya konan" value={<span className="font-display tnum" style={{ color: GOLD }}>{formatKLR(effectiveStake)} KLR</span>} />
            <SumRow label="Olası dönüş" value={<span className="font-display tnum">0 – {formatKLR(effectiveStake * maxMult)} KLR</span>} />
            <SumRow label="Kural" value={<span style={{ color: 'rgba(244,236,250,.75)' }}>Süre bitmeden kalkış yok</span>} />
          </div>

          {error && <div style={{ color: '#F06A6A', fontSize: 12, textAlign: 'center', marginTop: 12 }}>{error}</div>}

          <div style={{ marginTop: 'auto', padding: '18px 0 40px' }}>
            <button
              type="button"
              onClick={sit}
              disabled={busy}
              className="w-full flex items-center justify-center"
              style={{ height: 56, borderRadius: 16, background: 'linear-gradient(90deg,#9B3FD4,#C86AF5)', color: '#14081C', fontSize: 15, fontWeight: 800, boxShadow: '0 0 24px rgba(200,106,245,.5)', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Masaya oturuluyor…' : 'Masaya Otur 🎰'}
            </button>
          </div>
        </div>
      )}

      {phase === 'active' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '0 26px' }}>
          <div className="animate-klr-pulse" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.2em', color: NEON }}>MASADASIN</div>
          <div
            className="flex items-center justify-center"
            style={{ width: 230, height: 230, borderRadius: '50%', marginTop: 22, background: `conic-gradient(${NEON} 0 ${elapsedFrac * 360}deg,rgba(255,255,255,.07) ${elapsedFrac * 360}deg 360deg)`, boxShadow: '0 0 60px rgba(200,106,245,.25)' }}
          >
            <div className="flex flex-col items-center justify-center" style={{ width: 206, height: 206, borderRadius: '50%', background: '#0F0818' }}>
              <div className="font-display tnum" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-.01em' }} suppressHydrationWarning>{countdown(endMs, now)}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(244,236,250,.45)', marginTop: 4 }}>{hours} saatlik masada</div>
            </div>
          </div>
          <div className="flex items-center gap-[10px]" style={{ marginTop: 26, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(244,236,250,.12)', borderRadius: 999, padding: '10px 20px' }}>
            <Coin size={22} glow={false} />
            <span className="font-display tnum" style={{ fontSize: 16, fontWeight: 700, color: GOLD }}>{formatKLR(effectiveStake)} KLR</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(244,236,250,.5)' }}>masada</span>
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 500, color: 'rgba(244,236,250,.5)', marginTop: 22, maxWidth: 250 }}>
            Masadan kalkamazsın. Kasa kararını veriyor; sen bu arada su iç. 💧
          </div>
          <div style={{ width: '100%', padding: '24px 0 40px', marginTop: 'auto' }}>
            <button
              type="button"
              onClick={reveal}
              disabled={!timeUp || busy}
              className="w-full flex items-center justify-center"
              style={{ height: 52, borderRadius: 16, border: `1.5px solid ${timeUp ? NEON : 'rgba(244,236,250,.15)'}`, color: timeUp ? NEON : 'rgba(244,236,250,.4)', fontSize: 14, fontWeight: 700 }}
            >
              {timeUp ? (busy ? 'Açılıyor…' : 'Sonucu aç 🎲') : `Sonuç ${countdown(endMs, now)} sonra`}
            </button>
          </div>
        </div>
      )}

      {phase === 'reveal' && result && (
        <>
          <CoinRain z={1} />
          <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '0 26px', position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.24em', color: 'rgba(244,236,250,.5)' }}>SONUÇ</div>
            <div className="font-display animate-klr-pop" style={{ fontSize: 96, lineHeight: 1, fontWeight: 800, letterSpacing: '-.04em', marginTop: 10, color: NEON, textShadow: '0 0 50px rgba(200,106,245,.7)' }}>
              x{result.multiplier.toFixed(1).replace('.', ',')}
            </div>
            <div className="flex items-center gap-[10px] font-display tnum" style={{ marginTop: 18, fontSize: 20, fontWeight: 700 }}>
              <span style={{ color: 'rgba(244,236,250,.45)' }}>{formatKLR(effectiveStake)}</span>
              <span style={{ color: NEON }}>→</span>
              <span style={{ color: GOLD, textShadow: '0 0 20px rgba(242,193,78,.5)' }}>{formatKLR(result.payout)} KLR</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(244,236,250,.55)', marginTop: 14 }}>
              {result.payout >= effectiveStake ? 'Kasa bu sefer kaybetti. Kimseye söyleme. 🤫' : 'Kasa kazandı. Bir dahakine 😏'}
            </div>
            <div className="flex gap-2" style={{ marginTop: 8, fontSize: 10.5, fontWeight: 600, color: 'rgba(244,236,250,.4)' }}>
              <span style={{ border: '1px solid rgba(244,236,250,.15)', borderRadius: 999, padding: '4px 10px' }}>{hours} saat masada</span>
              <span style={{ border: '1px solid rgba(244,236,250,.15)', borderRadius: 999, padding: '4px 10px' }}>şans: %{result.percentile}&apos;lik dilim</span>
            </div>
          </div>
          <div style={{ padding: '0 22px 40px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 2 }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center justify-center"
              style={{ height: 56, borderRadius: 16, background: 'linear-gradient(90deg,#D9A514,#F2C14E)', color: '#3A2C00', fontSize: 15, fontWeight: 800, boxShadow: '0 0 24px rgba(242,193,78,.45)' }}
            >
              Topla · {formatKLR(result.payout)} KLR
            </button>
            <button
              type="button"
              onClick={() => { setPhase('setup'); setResult(null); setError(null); }}
              className="flex items-center justify-center"
              style={{ height: 52, borderRadius: 16, border: '1.5px solid rgba(200,106,245,.4)', color: NEON, fontSize: 14, fontWeight: 700 }}
            >
              Bir el daha 😈
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function neonBox(active: boolean): React.CSSProperties {
  return active
    ? { background: 'rgba(200,106,245,.16)', border: `1.5px solid ${NEON}`, color: NEON, boxShadow: '0 0 14px rgba(200,106,245,.3)' }
    : { border: '1.5px solid rgba(244,236,250,.15)', color: 'rgba(244,236,250,.6)' };
}

function SumRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'rgba(244,236,250,.5)' }}>{label}</span>
      {value}
    </div>
  );
}
