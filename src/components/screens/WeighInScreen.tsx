'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Coin } from '../Coin';
import { PhotoUpload } from '../PhotoUpload';
import { postApi } from '../api';
import { formatKg } from '@/lib/money';
import { WEIGH_IN_TOLERANCE_KG, WEIGH_IN_REWARD } from '@/lib/domain/constants';

export function WeighInScreen({
  expectedKg,
  weekLabel,
  nextLabel,
  isWeighDay,
}: {
  expectedKg: number;
  weekLabel: string;
  nextLabel: string;
  isWeighDay: boolean;
}) {
  const [entered, setEntered] = useState<number>(Number((expectedKg - 0.2).toFixed(1)));
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewarded, setRewarded] = useState(false);

  const low = expectedKg - 0.8;
  const span = 1.6;
  const markerPct = Math.max(0, Math.min(100, ((entered - low) / span) * 100));
  const diff = entered - expectedKg;
  const eligible = diff <= WEIGH_IN_TOLERANCE_KG;
  const green = diff <= 0.01;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await postApi<{ eligible: boolean }>('/api/weigh-in', { weightKg: entered, photoPath: photo });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRewarded(true);
  }

  if (!isWeighDay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '0 30px' }}>
        <div style={{ fontSize: 44 }}>⚖️</div>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>Bugün tartı günü değil</div>
        <div className="text-t55" style={{ fontSize: 13, fontWeight: 500, marginTop: 8, maxWidth: 240 }}>
          Sıradaki tartı: <b>{nextLabel}</b>. O gün beklenen kilon {formatKg(expectedKg)} kg.
        </div>
        <Link href="/" className="text-accent" style={{ fontSize: 13, fontWeight: 700, marginTop: 18 }}>Ana ekrana dön →</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-[13px]" style={{ padding: '70px 20px 0' }}>
      <div className="flex justify-between items-center">
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Tartı Günü ⚖️</div>
        <span className="bg-acc-soft text-accent rounded-full" style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 12px' }}>{weekLabel}</span>
      </div>

      <div className="bg-surface border border-border rounded-[20px] shadow-card" style={{ padding: '18px 16px' }}>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em' }}>BEKLENEN</div>
            <div className="font-display tnum text-t55" style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{formatKg(expectedKg)}</div>
            <div className="text-t35" style={{ fontSize: 11, fontWeight: 600 }}>kg</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }} />
          <div>
            <div className="text-accent" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em' }}>GİRİLEN</div>
            <input
              type="number"
              step={0.1}
              inputMode="decimal"
              value={entered}
              onChange={(e) => setEntered(Number(e.target.value))}
              className="font-display tnum text-accent bg-transparent text-center outline-none"
              style={{ fontSize: 30, fontWeight: 700, marginTop: 4, width: 90 }}
            />
            <div className="text-t35" style={{ fontSize: 11, fontWeight: 600 }}>kg</div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="flex justify-between text-t45" style={{ fontSize: 10, fontWeight: 600 }}>
            <span>{formatKg(low)}</span>
            <span>tolerans: +{formatKg(WEIGH_IN_TOLERANCE_KG)} kg</span>
            <span>{formatKg(low + span)}</span>
          </div>
          <div
            className="rounded-full relative"
            style={{ height: 10, marginTop: 5, opacity: 0.85, background: 'linear-gradient(90deg,var(--good) 0 56%,#D9A514 56% 68%,var(--bad) 68% 100%)' }}
          >
            <div style={{ position: 'absolute', left: `${markerPct}%`, top: -4, width: 4, height: 18, borderRadius: 2, background: 'var(--text)', boxShadow: '0 0 0 2px var(--surface)', transform: 'translateX(-2px)' }} />
          </div>
          <div className={green ? 'text-good' : eligible ? 'text-gold' : 'text-bad'} style={{ fontSize: 11.5, fontWeight: 600, marginTop: 7 }}>
            {green
              ? `Yeşil bölgedesin — beklenenin ${formatKg(Math.abs(diff))} kg altı. 👏`
              : eligible
                ? `Tolerans içinde — beklenenin ${formatKg(diff)} kg üstü.`
                : `Beklenenin ${formatKg(diff)} kg üstü — ödül yok bu sefer.`}
          </div>
        </div>
      </div>

      <PhotoUpload
        bucket="weigh-photos"
        title="Baskül fotoğrafı"
        hint="Ayak parmakların da görünsün — kurallar kurallardır."
        onUploaded={setPhoto}
      />

      {rewarded && eligible && (
        <div className="bg-gold-bg border-[1.5px] border-gold-border rounded-[20px] text-center animate-klr-pop" style={{ padding: 18 }}>
          <div className="flex justify-center items-center gap-[10px]">
            <Coin size={30} flip glow={false} />
            <span className="font-display tnum text-gold" style={{ fontSize: 32, fontWeight: 700 }}>+{WEIGH_IN_REWARD}</span>
            <span className="font-display text-gold" style={{ fontSize: 14, fontWeight: 700 }}>KLR</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>Tartı ödülü kazandın! 🎉</div>
          <div className="text-t55" style={{ fontSize: 11.5, fontWeight: 500, marginTop: 3 }}>Admin onayından sonra bakiyene geçer.</div>
        </div>
      )}

      {error && <div className="text-bad text-center" style={{ fontSize: 12 }}>{error}</div>}

      {!rewarded && (
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="bg-accent text-btntext rounded-[16px] flex items-center justify-center disabled:opacity-60"
          style={{ height: 54, fontSize: 15, fontWeight: 700 }}
        >
          {busy ? 'Gönderiliyor…' : 'Tartıyı gönder'}
        </button>
      )}

      <div className="text-center text-t45" style={{ fontSize: 12, fontWeight: 500 }}>
        Sonraki tartı: <b>{nextLabel}</b>
      </div>
    </div>
  );
}
