import { assertCron, ok } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/admin';
import { processDessertBombs } from '@/lib/game/bombs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Every 15 minutes — resolves dessert bombs past their deadline.
export async function GET(req: Request) {
  const c = assertCron(req);
  if (c) return c;

  const admin = createAdminClient();
  const summary = await processDessertBombs(admin);
  return ok(summary);
}
