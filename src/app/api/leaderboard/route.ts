import { ok, requireApprovedMember } from '@/lib/api';
import { computeLeaderboard } from '@/lib/game/portfolio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, seasonId } = guard;
  const rows = await computeLeaderboard(admin, seasonId);
  return ok(rows);
}
