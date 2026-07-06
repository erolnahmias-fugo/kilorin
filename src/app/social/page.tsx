import { AppShell } from '@/components/AppShell';
import { SocialScreen } from '@/components/screens/SocialScreen';
import { getSessionContext } from '@/lib/game/session';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

export default async function SocialPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  let myMemberId: string | null = null;
  try {
    const ctx = await getSessionContext();
    myMemberId = ctx.member?.id ?? null;
  } catch {
    /* fall back to demo leaderboard */
  }
  return (
    <AppShell>
      <SocialScreen myMemberId={myMemberId} />
    </AppShell>
  );
}
