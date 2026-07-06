import { ok, requireApprovedMember } from '@/lib/api';
import { computeNetWorth } from '@/lib/game/portfolio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, memberId } = guard;
  const result = await computeNetWorth(admin, memberId);
  return ok(result);
}
