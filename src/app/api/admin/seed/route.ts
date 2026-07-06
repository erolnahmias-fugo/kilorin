import { assertCron, ok, fail } from '@/lib/api';
import { runSeed } from '../../../../../scripts/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * One-shot demo seeding over HTTP, for environments where the sandbox can't
 * reach Supabase directly. Same guard as the cron routes (Bearer CRON_SECRET).
 * Idempotent — safe to call more than once. Remove the route (or rotate
 * CRON_SECRET) once the real season starts.
 */
export async function POST(req: Request) {
  const c = assertCron(req);
  if (c) return c;
  return execute();
}

// Browser-friendly variant: /api/admin/seed?secret=<CRON_SECRET>
// (so seeding is a single address-bar visit after deploy).
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    const c = assertCron(req);
    if (c) return c;
  }
  return execute();
}

async function execute() {
  try {
    await runSeed();
    return ok({ seeded: true });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'seed failed', 500);
  }
}
