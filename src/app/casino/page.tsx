import { CasinoScreen } from '@/components/screens/CasinoScreen';
import { getSessionContext } from '@/lib/game/session';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

export default async function CasinoPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  let balance = 12480;
  try {
    const ctx = await getSessionContext();
    if (ctx.member) {
      const supabase = await createServerSupabase();
      const res = await supabase.from('member_balances').select('balance').eq('member_id', ctx.member.id).maybeSingle();
      const data = res.data as Tables<'member_balances'> | null;
      balance = data?.balance ?? balance;
    }
  } catch {
    /* fall back to demo balance */
  }
  return <CasinoScreen balance={balance} />;
}
