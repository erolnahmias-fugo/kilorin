import { NextResponse } from 'next/server';
import { getSessionContext, type SessionContext } from './game/session';
import { createAdminClient } from './supabase/admin';
import { env } from './env';

/** Turkish messages for the exceptions raised by the SQL RPCs. */
export const RPC_ERROR_TR: Record<string, string> = {
  insufficient_balance: 'Bakiyen yetmiyor.',
  insufficient_stock: 'Stok tükendi.',
  offer_unavailable: 'Bu fırsat artık geçerli değil.',
  offer_expired: 'Vitrin yenilendi, bu fırsat kapandı.',
  below_min_stake: 'Minimum tutarın altında.',
  missing_price: 'Fiyat alınamadı, tekrar dene.',
  not_owner: 'Bu işlem senin değil.',
  not_found: 'Bulunamadı.',
  not_open: 'Bu pozisyon kapalı.',
  not_listable: 'Bu varlık ilana konulamaz.',
  bad_target: 'Geçersiz hedef oyuncu.',
  bad_stake: 'Geçersiz tutar.',
  bad_duration: 'Geçersiz süre.',
  shield_full: 'Kalkan envanterin dolu (max 2).',
  cheat_used: 'Bu hafta Cheat Day hakkını kullandın.',
  item_unavailable: 'Ürün bulunamadı.',
};

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Maps a thrown DB/RPC error to a friendly Turkish response. */
export function rpcError(e: unknown) {
  const raw = (e as { message?: string })?.message ?? '';
  for (const key of Object.keys(RPC_ERROR_TR)) {
    if (raw.includes(key)) return fail(RPC_ERROR_TR[key]!, 400);
  }
  console.error('rpc error', e);
  return fail('Bir şeyler ters gitti.', 500);
}

/** Route guard: requires an approved member. Returns context + a service-role client. */
export async function requireApprovedMember(): Promise<
  | { ok: true; ctx: SessionContext; memberId: string; seasonId: string; admin: ReturnType<typeof createAdminClient> }
  | { ok: false; response: NextResponse }
> {
  const ctx = await getSessionContext();
  if (!ctx.userId) return { ok: false, response: fail('Giriş yapmalısın.', 401) };
  if (!ctx.member || ctx.member.status !== 'approved') {
    return { ok: false, response: fail('Sezona kabul edilmen gerekiyor.', 403) };
  }
  return {
    ok: true,
    ctx,
    memberId: ctx.member.id,
    seasonId: ctx.member.season_id,
    admin: createAdminClient(),
  };
}

/** Cron guard: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. */
export function assertCron(req: Request): NextResponse | null {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${env.cronSecret()}`) return fail('unauthorized', 401);
  return null;
}
