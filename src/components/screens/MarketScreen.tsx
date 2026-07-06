'use client';
import { useState } from 'react';
import { BottomSheet } from '../BottomSheet';
import { Countdown } from '../Countdown';
import { postApi } from '../api';
import { formatKLR } from '@/lib/money';
import type { OfferView } from '../demo';

const colorClass = (c?: 'good' | 'bad' | 'text') => (c === 'good' ? 'text-good' : c === 'bad' ? 'text-bad' : 'text-text');

export function MarketScreen({
  offers,
  showcaseMs,
  balance,
}: {
  offers: OfferView[];
  showcaseMs: number;
  balance: number;
}) {
  const [selected, setSelected] = useState<OfferView | null>(null);

  return (
    <div className="flex-1 flex flex-col gap-[11px]" style={{ padding: '70px 18px 0' }}>
      <div className="flex justify-between items-center">
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Piyasa</div>
        <div className="text-right">
          <div className="text-t45" style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.1em' }}>VİTRİN YENİLENİR</div>
          <Countdown to={showcaseMs} className="text-gold" style={{ fontSize: 14, fontWeight: 700 }} />
        </div>
      </div>

      {offers.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setSelected(o)}
          className="bg-surface border border-border rounded-[18px] shadow-card text-left"
          style={{ padding: '14px 15px' }}
        >
          <div className="flex items-center gap-[10px]">
            <div className="rounded-[12px] bg-acc-soft flex items-center justify-center flex-none" style={{ width: 38, height: 38, fontSize: 18 }}>
              {o.emoji}
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.title}</div>
              <div className="text-t55" style={{ fontSize: 11, fontWeight: 500 }}>{o.subtitle}</div>
            </div>
            <div className="text-right">
              <div className={`font-display tnum ${colorClass(o.rightTopColor)}`} style={{ fontSize: 16, fontWeight: 700 }}>{o.rightTop}</div>
              <div className="text-t45" style={{ fontSize: 10, fontWeight: 600 }}>{o.rightBottom}</div>
            </div>
          </div>
          <div className="flex justify-between items-center border-t border-border" style={{ marginTop: 11, paddingTop: 10 }}>
            <span className={o.footLeftColor === 'bad' ? 'text-bad' : 'text-t45'} style={{ fontSize: 11, fontWeight: 600 }}>{o.footLeft}</span>
            <span className="text-accent" style={{ fontSize: 12, fontWeight: 700 }}>İncele →</span>
          </div>
        </button>
      ))}

      <div className="text-center text-t35" style={{ fontSize: 11, fontWeight: 500 }}>
        Küçük yazıları oku. Kasa okumayana acımaz. 😏
      </div>

      {selected && <PurchaseSheet offer={selected} balance={balance} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PurchaseSheet({ offer, balance, onClose }: { offer: OfferView; balance: number; onClose: () => void }) {
  const [lots, setLots] = useState(1);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const cost = offer.pricePerLot * lots;
  const fee = Math.round(cost * 0.01);
  const remaining = balance - cost - fee;

  async function confirm() {
    if (!agree) {
      setError('Koşulları onayla.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await postApi<{ positionId: string }>('/api/market/buy', { offerId: offer.id, lots });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    setTimeout(onClose, 900);
  }

  return (
    <BottomSheet open onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="rounded-[14px] bg-gold-bg flex items-center justify-center" style={{ width: 46, height: 46, fontSize: 22 }}>{offer.emoji}</div>
        <div className="flex-1">
          <div className="font-display" style={{ fontSize: 17, fontWeight: 700 }}>{offer.title}</div>
          <div className="text-t55" style={{ fontSize: 12, fontWeight: 500 }}>
            1 lot = <span className="tnum">{formatKLR(offer.pricePerLot)} KLR</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-bg border border-border rounded-[16px]" style={{ padding: '12px 14px', marginTop: 18 }}>
        <button type="button" onClick={() => setLots((l) => Math.max(1, l - 1))} className="rounded-[12px] border-[1.5px] border-border text-t45 font-display" style={{ width: 40, height: 40, fontSize: 20, fontWeight: 700 }}>−</button>
        <div className="text-center font-display tnum" style={{ fontSize: 26, fontWeight: 700 }}>
          {lots} <span className="text-t45" style={{ fontFamily: 'var(--font-manrope)', fontSize: 13, fontWeight: 600 }}>lot</span>
        </div>
        <button type="button" onClick={() => setLots((l) => l + 1)} className="rounded-[12px] bg-acc-soft border-[1.5px] border-accent text-accent font-display" style={{ width: 40, height: 40, fontSize: 20, fontWeight: 700 }}>+</button>
      </div>

      <div className="flex flex-col gap-[9px]" style={{ marginTop: 16, fontSize: 13, fontWeight: 600 }}>
        <Row label="Maliyet" value={`${formatKLR(cost)} KLR`} />
        <Row label="İşlem ücreti (%1)" value={`${formatKLR(fee)} KLR`} />
        <div className="flex justify-between border-t border-dashed border-border" style={{ paddingTop: 9 }}>
          <span className="text-t55">Kalan bakiye</span>
          <span className={`font-display tnum ${remaining < 0 ? 'text-bad' : ''}`} style={{ fontWeight: 700 }}>{formatKLR(remaining)} KLR</span>
        </div>
      </div>

      <button type="button" onClick={() => setAgree((a) => !a)} className="w-full flex items-center gap-[10px] bg-acc-soft rounded-[12px] text-left" style={{ padding: '10px 12px', marginTop: 14 }}>
        <span className={`rounded-[6px] flex items-center justify-center flex-none ${agree ? 'bg-accent text-btntext' : 'border-[1.5px] border-dash'}`} style={{ width: 20, height: 20, fontSize: 12, fontWeight: 700 }}>
          {agree ? '✓' : ''}
        </span>
        <span className="text-t80" style={{ fontSize: 11.5, fontWeight: 500 }}>Koşulları okudum: fiyat düşerse ağlamak serbest, iade yok.</span>
      </button>

      {error && <div className="text-bad text-center" style={{ fontSize: 12, marginTop: 12 }}>{error}</div>}

      <button
        type="button"
        onClick={confirm}
        disabled={busy || done || remaining < 0}
        className="w-full bg-accent text-btntext rounded-[16px] flex items-center justify-center disabled:opacity-60"
        style={{ height: 54, fontSize: 15, fontWeight: 700, marginTop: 16 }}
      >
        {done ? 'Alındı ✓' : busy ? 'İşleniyor…' : `Satın al · ${formatKLR(cost + fee)} KLR`}
      </button>
      <button type="button" onClick={onClose} className="w-full text-center text-t45" style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>Vazgeç</button>
      <div className="text-center text-t35" style={{ fontSize: 10.5, fontWeight: 500, marginTop: 10 }}>
        Yatırım tavsiyesi değildir. Hiçbir şey tavsiye değildir. 😌
      </div>
    </BottomSheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-t55">{label}</span>
      <span className="font-display tnum">{value}</span>
    </div>
  );
}
