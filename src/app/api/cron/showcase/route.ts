import { assertCron, ok } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { refreshShowcase } from '@/lib/game/showcase';
import { notify } from '@/lib/game/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Every 15 minutes — refreshes showcases whose timer has elapsed.
export async function GET(req: Request) {
  const c = assertCron(req);
  if (c) return c;

  const admin = createAdminClient();
  const nowISO = new Date().toISOString();

  const { data: seasons } = await admin
    .from('seasons')
    .select('*')
    .eq('status', 'active')
    .lte('next_showcase_at', nowISO);

  let refreshed = 0;
  for (const season of seasons ?? []) {
    const result = await refreshShowcase(admin, season);
    refreshed++;

    const { data: members } = await admin
      .from('season_members')
      .select('id')
      .eq('season_id', season.id)
      .eq('status', 'approved');
    for (const m of members ?? []) {
      await notify(admin, m.id, 'showcase', 'Yeni fırsatlar geldi!', 'Vitrin yenilendi.', {
        offerCount: result.offerCount,
      });
    }
  }

  return ok({ refreshed });
}
