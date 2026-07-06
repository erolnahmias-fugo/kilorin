import { AppShell } from '@/components/AppShell';
import { MarketScreen } from '@/components/screens/MarketScreen';
import { demoOffers, type OfferView } from '@/components/demo';
import { getSessionContext } from '@/lib/game/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatKLR } from '@/lib/money';
import type { Tables } from '@/lib/supabase/database.types';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

const OFFER_EMOJI: Record<string, string> = {
  interest: '🏦', crypto: '🪙', stock: '📈', fx: '💱', fund: '📊', real_estate: '🏠', car: '🏎', watch: '⌚',
};

/** Map a raw offer row to a display card — traps are rendered identically (never flagged). */
function toView(o: Tables<'market_offers'>): OfferView {
  const emoji = OFFER_EMOJI[o.type] ?? '💠';
  const yieldy = o.type === 'interest' || o.type === 'fund';
  const priced = ['crypto', 'stock', 'fx', 'real_estate', 'car', 'watch'].includes(o.type);
  const rightTop = yieldy && o.rate != null ? `%${Math.round(o.rate * 100)}` : formatKLR(o.price_per_lot);
  const rightBottom = yieldy
    ? o.lock_hours != null
      ? `${Math.round(o.lock_hours / 24)} günde`
      : 'vadede'
    : priced
      ? 'KLR'
      : '';
  const lowStock = o.stock != null && o.stock <= 1;
  const footLeft = lowStock
    ? 'Son 1 adet!'
    : o.min_stake != null
      ? `Min ${formatKLR(o.min_stake)} KLR`
      : o.stock != null
        ? `Kalan stok: ${o.stock} lot`
        : 'stok sınırsız';
  return {
    id: o.id,
    type: o.type,
    emoji,
    title: o.title,
    subtitle: o.subtitle ?? '',
    rightTop,
    rightTopColor: yieldy ? 'good' : 'text',
    rightBottom,
    footLeft,
    footLeftColor: lowStock ? 'bad' : 't45',
    pricePerLot: o.price_per_lot,
    rate: o.rate,
    leverage: o.leverage,
  };
}

async function load(): Promise<{ offers: OfferView[]; showcaseMs: number; balance: number }> {
  const fallback = { offers: demoOffers, showcaseMs: Date.now() + 2 * 3600_000 + 14 * 60_000, balance: 12480 };
  try {
    const ctx = await getSessionContext();
    if (!ctx.member || ctx.member.status !== 'approved') return fallback;
    const supabase = await createServerSupabase();
    const [offersRes, balRes] = await Promise.all([
      supabase.from('market_offers').select('*').eq('season_id', ctx.member.season_id).eq('active', true),
      supabase.from('member_balances').select('balance').eq('member_id', ctx.member.id).maybeSingle(),
    ]);
    const offers = offersRes.data as Tables<'market_offers'>[] | null;
    const bal = balRes.data as Tables<'member_balances'> | null;
    const showcase = ctx.member.seasons?.next_showcase_at;
    return {
      offers: offers && offers.length ? offers.map(toView) : demoOffers,
      showcaseMs: showcase ? Date.parse(showcase) : fallback.showcaseMs,
      balance: bal?.balance ?? fallback.balance,
    };
  } catch {
    return fallback;
  }
}

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  const { offers, showcaseMs, balance } = await load();
  return (
    <AppShell>
      <MarketScreen offers={offers} showcaseMs={showcaseMs} balance={balance} />
    </AppShell>
  );
}
