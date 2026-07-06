import { assertCron, ok } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { closeMemberDay } from '@/lib/game/closeDay';
import { notify } from '@/lib/game/notify';
import { istanbulDateStr, istanbulNow } from '@/lib/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Runs 00:05 Europe/Istanbul (21:05 UTC) — closes YESTERDAY's Istanbul date.
export async function GET(req: Request) {
  const c = assertCron(req);
  if (c) return c;

  const admin = createAdminClient();
  const yesterday = istanbulDateStr(istanbulNow().minus({ days: 1 }));

  const { data: seasons } = await admin.from('seasons').select('id').eq('status', 'active');
  let closed = 0;
  let rewarded = 0;

  for (const season of seasons ?? []) {
    const { data: members } = await admin
      .from('season_members')
      .select('*')
      .eq('season_id', season.id)
      .eq('status', 'approved');

    for (const member of members ?? []) {
      const summary = await closeMemberDay(admin, member, yesterday);
      if (summary.skipped) continue;
      closed++;
      if ((summary.total ?? 0) > 0) {
        rewarded++;
        await notify(
          admin,
          member.id,
          'daily_reward',
          `+${summary.total} KLR günlük ödül`,
          summary.outcome === 'reward'
            ? `Seri: ${summary.newStreakDays} gün`
            : undefined,
          { date: yesterday, total: summary.total, streak: summary.newStreakDays },
        );
      } else if (summary.outcome === 'shielded') {
        await notify(admin, member.id, 'shield', 'Kalkan kullanıldı', 'Serin korundu.', {
          date: yesterday,
        });
      }
    }
  }

  return ok({ date: yesterday, closed, rewarded });
}
