import { fail, ok } from '@/lib/api';
import { getPrices } from '@/lib/prices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('ids');
  if (!raw) return fail('ids gerekli.', 422);
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) return fail('ids gerekli.', 422);
  const quotes = await getPrices(ids);
  return ok(quotes);
}
