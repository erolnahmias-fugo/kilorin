import { z } from 'zod';
import { fail, ok, rpcError, requireApprovedMember } from '@/lib/api';
import type { Json } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  itemKey: z.string().min(1),
  meta: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, memberId } = guard;

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return fail('Geçersiz istek.', 422);
  }

  try {
    const { data, error } = await admin.rpc('shop_purchase', {
      p_member: memberId,
      p_item_key: parsed.itemKey,
      p_meta: (parsed.meta ?? {}) as Json,
    });
    if (error) throw error;
    return ok({ purchaseId: data });
  } catch (e) {
    return rpcError(e);
  }
}
