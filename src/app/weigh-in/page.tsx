import { AppShell } from '@/components/AppShell';
import { WeighInScreen } from '@/components/screens/WeighInScreen';
import { getSessionContext } from '@/lib/game/session';
import { istanbulDateStr, isWeighInDay } from '@/lib/time';
import { requireApprovedPage } from '@/lib/game/guard';

export const dynamic = 'force-dynamic';

export default async function WeighInPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  await requireApprovedPage(sp.demo === '1');
  let expectedKg = 84.2;
  let isWeighDay = true;
  let weekLabel = 'SALI · HAFTA 5';
  const nextLabel = 'Cuma · Beklenen: 83,9 kg';

  try {
    const ctx = await getSessionContext();
    const member = ctx.member;
    if (member) {
      expectedKg = member.current_kg ?? expectedKg;
      const weighDays = member.seasons?.weigh_days ?? ['Sal', 'Cum'];
      isWeighDay = isWeighInDay(istanbulDateStr(), weighDays);
    }
  } catch {
    /* fall back to demo weigh-day */
  }

  return (
    <AppShell>
      <WeighInScreen expectedKg={expectedKg} weekLabel={weekLabel} nextLabel={nextLabel} isWeighDay={isWeighDay} />
    </AppShell>
  );
}
