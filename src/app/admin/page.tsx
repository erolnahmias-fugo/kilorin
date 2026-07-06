import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { AdminScreen, type PendingMember, type WeighDispute } from '@/components/screens/AdminScreen';
import { getSessionContext } from '@/lib/game/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatKg, formatKLR } from '@/lib/money';
import type { Tables } from '@/lib/supabase/database.types';

export const dynamic = 'force-dynamic';

const demoPending: PendingMember[] = [
  { id: 'p1', name: 'Merve · 31', initial: 'M', detail: '72,0 → 66,0 kg · 1.620 kcal/gün' },
];
const demoDisputes: WeighDispute[] = [
  { id: 'd1', name: 'Burak · Salı tartısı', detail: 'Fotoğraf bulanık, ekran okunmuyor 🤨' },
];

export default async function AdminPage() {
  let pending = demoPending;
  let disputes = demoDisputes;
  let lengthWeeks = 12;
  let weighDays = ['Sal', 'Cum'];
  let allowDemo = true;

  try {
    const ctx = await getSessionContext();
    if (ctx.userId && ctx.member && !ctx.member.is_admin) redirect('/');
    if (ctx.member?.is_admin) {
      allowDemo = false;
      const supabase = await createServerSupabase();
      const seasonId = ctx.member.season_id;
      lengthWeeks = ctx.member.seasons?.length_weeks ?? 12;
      weighDays = ctx.member.seasons?.weigh_days ?? weighDays;

      const pendRes = await supabase
        .from('season_members')
        .select('id, user_id, current_kg, target_kg, daily_target_kcal, age')
        .eq('season_id', seasonId)
        .eq('status', 'pending');
      const pend = pendRes.data as Pick<Tables<'season_members'>, 'id' | 'user_id' | 'current_kg' | 'target_kg' | 'daily_target_kcal' | 'age'>[] | null;
      if (pend && pend.length) {
        const usersRes = await supabase.from('users').select('id, display_name').in('id', pend.map((p) => p.user_id));
        const users = usersRes.data as Pick<Tables<'users'>, 'id' | 'display_name'>[] | null;
        const nameById = new Map((users ?? []).map((u) => [u.id, u.display_name ?? 'Üye']));
        pending = pend.map((p) => {
          const name = nameById.get(p.user_id) ?? 'Üye';
          return {
            id: p.id,
            name: `${name}${p.age ? ` · ${p.age}` : ''}`,
            initial: name.charAt(0).toUpperCase(),
            detail: `${formatKg(p.current_kg ?? 0)} → ${formatKg(p.target_kg ?? 0)} kg · ${formatKLR(p.daily_target_kcal ?? 0)} kcal/gün`,
          };
        });
      } else {
        pending = [];
      }

      const revsRes = await supabase
        .from('weigh_ins')
        .select('id, member_id, weigh_date')
        .eq('admin_rejected', false)
        .order('created_at', { ascending: false })
        .limit(10);
      const revs = revsRes.data as Pick<Tables<'weigh_ins'>, 'id' | 'member_id' | 'weigh_date'>[] | null;
      disputes = (revs ?? []).map((r) => ({ id: r.id, name: `Tartı · ${r.weigh_date}`, detail: 'Fotoğraf incelemesi bekliyor 🤨' }));
    }
  } catch {
    /* fall back to demo */
  }

  if (allowDemo) {
    pending = demoPending;
    disputes = demoDisputes;
  }

  return (
    <AppShell>
      <AdminScreen pending={pending} disputes={disputes} lengthWeeks={lengthWeeks} weighDays={weighDays} />
    </AppShell>
  );
}
