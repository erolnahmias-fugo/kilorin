import { AppShell } from '@/components/AppShell';
import { PortfolioScreen } from '@/components/screens/PortfolioScreen';
import { getSessionContext } from '@/lib/game/session';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  let suspicious = true;
  try {
    const ctx = await getSessionContext();
    suspicious = !!ctx.member?.suspicious;
  } catch {
    /* fall back to demo (suspicious) */
  }
  return (
    <AppShell>
      <PortfolioScreen suspicious={suspicious} />
    </AppShell>
  );
}
