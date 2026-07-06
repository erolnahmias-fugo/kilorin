import { AppShell } from '@/components/AppShell';
import { PortfolioScreen } from '@/components/screens/PortfolioScreen';
import { requireApprovedPage } from '@/lib/game/guard';
import { computeNetWorth } from '@/lib/game/portfolio';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireApprovedPage(sp.demo === '1');

  // Demo mode (no ctx) renders the design-preview dataset.
  if (!ctx?.member) {
    return (
      <AppShell>
        <PortfolioScreen suspicious />
      </AppShell>
    );
  }

  const admin = createAdminClient();
  let initial = null;
  let loadError: string | null = null;
  let ownerName: string | null = null;
  try {
    const [nw, userRow] = await Promise.all([
      computeNetWorth(admin, ctx.member.id),
      admin.from('users').select('display_name').eq('id', ctx.member.user_id).maybeSingle(),
    ]);
    initial = nw;
    ownerName = (userRow.data as { display_name: string | null } | null)?.display_name ?? null;
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'bilinmeyen hata';
  }

  return (
    <AppShell>
      <PortfolioScreen
        suspicious={!!ctx.member.suspicious}
        initial={initial}
        loadError={loadError}
        ownerName={ownerName}
      />
    </AppShell>
  );
}
