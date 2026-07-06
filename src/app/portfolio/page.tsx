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

  let initial = null;
  let loadError: string | null = null;
  try {
    initial = await computeNetWorth(createAdminClient(), ctx.member.id);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'bilinmeyen hata';
  }

  return (
    <AppShell>
      <PortfolioScreen suspicious={!!ctx.member.suspicious} initial={initial} loadError={loadError} />
    </AppShell>
  );
}
