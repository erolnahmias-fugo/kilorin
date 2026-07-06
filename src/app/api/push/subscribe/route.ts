import { z } from 'zod';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { subscribeMember } from '@/lib/push';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }),
});

export async function POST(req: Request) {
  const guard = await requireApprovedMember();
  if (!guard.ok) return guard.response;
  const { admin, ctx } = guard;

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return fail('Geçersiz istek.', 422);
  }

  await subscribeMember(admin, ctx.userId!, parsed.subscription);
  return ok({ subscribed: true });
}
