import { AppShell } from '@/components/AppShell';
import { ShopScreen, type MemberOption } from '@/components/screens/ShopScreen';
import { demoShop, type ShopItemView } from '@/components/demo';
import { getSessionContext } from '@/lib/game/session';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

const CTA_FOR: Record<string, string> = { dessertBomb: 'Hedef seç' };
const PRIMARY = new Set(['aiAvatar']);

async function load(): Promise<{ items: ShopItemView[]; balance: number; members: MemberOption[] }> {
  const fallbackMembers: MemberOption[] = [
    { id: 'm1', name: 'Deniz', initial: 'D' },
    { id: 'm2', name: 'Burak', initial: 'B' },
    { id: 'm3', name: 'Seda', initial: 'S' },
    { id: 'm4', name: 'Can', initial: 'C' },
  ];
  const fallback = { items: demoShop, balance: 12480, members: fallbackMembers };
  try {
    const ctx = await getSessionContext();
    if (!ctx.member || ctx.member.status !== 'approved') return fallback;
    const supabase = await createServerSupabase();
    const [rowsRes, balRes, memsRes] = await Promise.all([
      supabase.from('shop_items').select('*').eq('active', true).order('sort'),
      supabase.from('member_balances').select('balance').eq('member_id', ctx.member.id).maybeSingle(),
      supabase.from('season_members').select('id, user_id').eq('season_id', ctx.member.season_id).eq('status', 'approved'),
    ]);
    const rows = rowsRes.data as Tables<'shop_items'>[] | null;
    const bal = balRes.data as Tables<'member_balances'> | null;
    const mems = memsRes.data as Pick<Tables<'season_members'>, 'id' | 'user_id'>[] | null;
    const items: ShopItemView[] =
      rows && rows.length
        ? rows.map((r) => ({
            id: r.id,
            key: r.key,
            emoji: r.emoji ?? '🎁',
            name: r.name,
            description: r.description ?? '',
            price: r.price,
            cta: CTA_FOR[r.key] ?? 'Al',
            highlight: PRIMARY.has(r.key),
            primary: PRIMARY.has(r.key),
          }))
        : demoShop;

    const others = (mems ?? []).filter((m) => m.id !== ctx.member!.id);
    let members: MemberOption[] = fallbackMembers;
    if (others.length) {
      const usersRes = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', others.map((m) => m.user_id));
      const users = usersRes.data as Pick<Tables<'users'>, 'id' | 'display_name'>[] | null;
      const nameById = new Map((users ?? []).map((u) => [u.id, u.display_name ?? 'Üye']));
      members = others.map((m) => {
        const name = nameById.get(m.user_id) ?? 'Üye';
        return { id: m.id, name, initial: name.charAt(0).toUpperCase() };
      });
    }
    return { items, balance: bal?.balance ?? fallback.balance, members };
  } catch {
    return fallback;
  }
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  const { items, balance, members } = await load();
  return (
    <AppShell>
      <ShopScreen items={items} balance={balance} members={members} />
    </AppShell>
  );
}
