'use client';
import { useEffect, useState } from 'react';
import { Coin } from '../Coin';
import { Countdown } from '../Countdown';
import { SuspicionBanner } from '../SuspicionBanner';
import { getApi, postApi } from '../api';
import { formatKLR, formatPct } from '@/lib/money';
import { demoPortfolio, type HoldingView } from '../demo';

interface ValuedPosition {
  id: string;
  type: string;
  title?: string | null;
  symbol?: string | null;
  amount_klr: number;
  lots?: number | null;
  rate?: number | null;
  leverage?: number | null;
  entry_price?: number | null;
  rent_per_day?: number | null;
  lock_end?: string | null;
  list_end?: string | null;
  status: string;
  currentValue: number;
  pnlPct: number;
  liquidated?: boolean;
  delayed?: boolean;
}
interface PortfolioData {
  net: number;
  liquid: number;
  valued: ValuedPosition[];
}

interface DisplayHolding extends HoldingView {
  lockEndMs?: number;
  listEndMs?: number;
}

const EMOJI: Record<string, string> = {
  interest: '🏦', crypto: '🪙', stock: '📈', fx: '💱', fund: '📊', real_estate: '🏠', car: '🏎', watch: '⌚',
};

function toDisplay(p: ValuedPosition): DisplayHolding {
  const emoji = EMOJI[p.type] ?? '💠';
  if (p.type === 'interest') {
    // "vadede" = payout at maturity (principal × (1+rate)), not today's accrual.
    const maturity = Math.round(p.amount_klr * (1 + Number(p.rate ?? 0)));
    return {
      id: p.id, emoji, title: p.title ?? 'Vadeli Mevduat', kind: 'locked', gold: true,
      subtitle: `${formatKLR(p.amount_klr)} → ${formatKLR(maturity)} KLR vadede`,
      lockEndMs: p.lock_end ? Date.parse(p.lock_end) : undefined,
    };
  }
  if (p.type === 'real_estate') {
    return {
      id: p.id, emoji, title: p.title ?? 'Gayrimenkul', kind: 'listable',
      subtitle: p.rent_per_day ? `kira +${p.rent_per_day}/gün · satış 24 saat sürer` : 'satış 24 saat sürer',
      listEndMs: p.list_end ? Date.parse(p.list_end) : undefined,
    };
  }
  if (p.type === 'car' || p.type === 'watch') {
    return { id: p.id, emoji, title: p.title ?? 'Prestij Varlık', kind: 'prestige', gold: true, subtitle: 'Prestij varlık · profilde sergileniyor' };
  }
  return {
    id: p.id, emoji, title: p.title ?? p.symbol ?? 'Pozisyon', kind: 'tradable', pnlPct: p.pnlPct,
    // Both sides are position totals in KLR (cost basis vs current value) — not the per-lot price.
    subtitle: `alış ${formatKLR(p.amount_klr)} · şimdi ${formatKLR(p.currentValue)}${p.liquidated ? ' · tasfiye' : ''}`,
  };
}

export function PortfolioScreen({
  suspicious,
  initial = null,
  loadError = null,
  ownerName = null,
}: {
  suspicious: boolean;
  /** Server-rendered portfolio; null = demo mode (design preview only). */
  initial?: PortfolioData | null;
  loadError?: string | null;
  /** Whose portfolio — demo-login links share one browser session, so make identity explicit. */
  ownerName?: string | null;
}) {
  const demo = initial === null && loadError === null;
  const [data, setData] = useState<PortfolioData | null>(initial);
  const [holdings, setHoldings] = useState<DisplayHolding[]>(
    initial ? initial.valued.map(toDisplay) : demo ? demoPortfolio.holdings : [],
  );
  const [delayed, setDelayed] = useState(initial?.valued.some((v) => v.delayed) ?? false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(loadError && `Portföy yüklenemedi: ${loadError}`);

  async function refresh() {
    const res = await getApi<PortfolioData>('/api/portfolio');
    if (res.ok) {
      setData(res.data);
      setHoldings(res.data.valued.map(toDisplay));
      setDelayed(res.data.valued.some((v) => v.delayed));
      setError(null);
    } else {
      setError(`Portföy yüklenemedi: ${res.error}`);
    }
  }

  // Refresh with live prices after mount (server render may be seconds old).
  useEffect(() => {
    if (demo) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  const net = data?.net ?? (demo ? demoPortfolio.net : 0);
  const liquid = data?.liquid ?? (demo ? demoPortfolio.liquid : 0);
  const valued = data ? data.net - data.liquid : demo ? demoPortfolio.valued : 0;

  async function sell(id: string) {
    setPending(id);
    const res = await postApi('/api/market/sell', { positionId: id });
    setPending(null);
    if (res.ok) {
      await refresh(); // resync value + cash together
    } else {
      setError(`Satış başarısız: ${res.error}`);
      await refresh(); // list may be stale (e.g. sold in another tab)
    }
  }
  async function list(id: string) {
    setPending(id);
    const res = await postApi('/api/market/list', { positionId: id });
    setPending(null);
    if (res.ok) {
      await refresh();
    } else {
      setError(`İlan başarısız: ${res.error}`);
      await refresh();
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-[10px]" style={{ padding: '70px 18px 0' }}>
      <div className="text-center">
        <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.16em' }}>
          NET SERVET{ownerName ? ` · ${ownerName.toUpperCase()}` : ''}
        </div>
        <div className="flex justify-center items-center gap-[10px]" style={{ marginTop: 6 }}>
          <Coin size={30} />
          <span className="font-display tnum num-glow" style={{ fontSize: 38, lineHeight: 1, fontWeight: 700 }}>{formatKLR(net)}</span>
        </div>
        <div className="flex justify-center gap-2" style={{ marginTop: 8, fontSize: 10.5, fontWeight: 600 }}>
          <span className="bg-surface border border-border rounded-full text-t55" style={{ padding: '4px 10px' }}>Nakit {formatKLR(liquid)}</span>
          <span className="bg-surface border border-border rounded-full text-t55" style={{ padding: '4px 10px' }}>Yatırım {formatKLR(valued)}</span>
        </div>
      </div>

      {suspicious && <SuspicionBanner daysLeft={2} />}

      {error && (
        <div className="bg-bad-soft border border-bad rounded-[14px] text-center" style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {!error && !demo && holdings.length === 0 && (
        <div className="text-center text-t45" style={{ fontSize: 12.5, fontWeight: 500, padding: '18px 0' }}>
          Henüz varlığın yok — Piyasa'dan bir şeyler kap. 💸
        </div>
      )}

      {delayed && (
        <div className="text-center text-t45" style={{ fontSize: 11, fontWeight: 500 }}>
          Bazı varlıklarda fiyat gecikmeli gösteriliyor.
        </div>
      )}

      {holdings.map((h) => (
        <HoldingCard key={h.id} h={h} busy={pending === h.id} onSell={() => sell(h.id)} onList={() => list(h.id)} />
      ))}

      <div className="text-center text-t35" style={{ fontSize: 11, fontWeight: 500 }}>
        Sıralama net servete göre · fiyatlar canlıdır.
      </div>
    </div>
  );
}

function HoldingCard({ h, busy, onSell, onList }: { h: DisplayHolding; busy: boolean; onSell: () => void; onList: () => void }) {
  return (
    <div
      className={`rounded-[16px] flex items-center gap-[11px] ${h.gold && h.kind === 'prestige' ? 'bg-gold-bg border border-gold-border' : 'bg-surface border border-border shadow-card'}`}
      style={{ padding: '12px 14px' }}
    >
      <div className={`rounded-[11px] flex items-center justify-center flex-none ${h.kind === 'locked' ? 'bg-acc-soft' : h.kind === 'tradable' ? 'bg-gold-bg' : h.kind === 'listable' ? 'bg-good-soft' : 'bg-surface'}`} style={{ width: 36, height: 36, fontSize: 17 }}>
        {h.emoji}
      </div>
      <div className="flex-1">
        <div className={h.kind === 'prestige' ? 'text-gold' : ''} style={{ fontSize: 13, fontWeight: 700 }}>{h.title}</div>
        <div className="text-t55" style={{ fontSize: 11, fontWeight: 500 }}>{h.subtitle}</div>
      </div>

      {h.kind === 'locked' && (
        <div className="text-right">
          <div className="font-display tnum text-gold" style={{ fontSize: 13, fontWeight: 700 }}>
            {h.lockEndMs ? <Countdown to={h.lockEndMs} withDays /> : h.timer ?? '—'}
          </div>
          <div className="text-t45" style={{ fontSize: 10, fontWeight: 600 }}>kaldı</div>
        </div>
      )}
      {h.kind === 'tradable' && (
        <div className="flex items-center gap-2">
          <span className={`font-display tnum ${(h.pnlPct ?? 0) >= 0 ? 'text-good' : 'text-bad'}`} style={{ fontSize: 13, fontWeight: 700 }}>{formatPct(h.pnlPct ?? 0)}</span>
          <button type="button" onClick={onSell} disabled={busy} className="bg-acc-soft text-accent rounded-full disabled:opacity-60" style={{ fontSize: 11, fontWeight: 700, padding: '6px 13px' }}>
            {busy ? '…' : 'Sat'}
          </button>
        </div>
      )}
      {h.kind === 'listable' && (
        <button type="button" onClick={onList} disabled={busy} className="border-[1.5px] border-acc-border text-accent rounded-full disabled:opacity-60" style={{ fontSize: 11, fontWeight: 700, padding: '6px 13px' }}>
          {busy ? '…' : 'İlana koy'}
        </button>
      )}
      {h.kind === 'prestige' && (
        <span className="text-gold" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em' }}>PRESTİJ</span>
      )}
    </div>
  );
}
