import { z } from 'zod';
import { fail, ok, rpcError, requireApprovedMember } from '@/lib/api';
import { getPrice } from '@/lib/prices';
import { MARKET_INSTRUMENTS, type OfferType } from '@/lib/domain/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  offerId: z.string().uuid(),
  lots: z.number().positive().optional(),
  amount: z.number().int().positive().optional(),
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

  const { data: offer } = await admin
    .from('market_offers')
    .select('*')
    .eq('id', parsed.offerId)
    .maybeSingle();
  if (!offer || !offer.active) return fail('Bu fırsat artık geçerli değil.', 400);

  try {
    let positionId: string | null = null;

    if (offer.type === 'interest') {
      if (!parsed.amount) return fail('Tutar gerekli.', 422);
      const { data, error } = await admin.rpc('buy_offer', {
        p_member: memberId,
        p_offer: offer.id,
        p_amount: parsed.amount,
      });
      if (error) throw error;
      positionId = data;
    } else if (MARKET_INSTRUMENTS.includes(offer.type as OfferType)) {
      if (!parsed.lots || !offer.instrument_id) return fail('Lot gerekli.', 422);
      const quote = await getPrice(offer.instrument_id);
      const { data, error } = await admin.rpc('buy_offer', {
        p_member: memberId,
        p_offer: offer.id,
        p_lots: parsed.lots,
        p_entry_price: quote.price,
      });
      if (error) throw error;
      positionId = data;
    } else {
      // real_estate / car / watch — flat priced.
      const { data, error } = await admin.rpc('buy_offer', {
        p_member: memberId,
        p_offer: offer.id,
      });
      if (error) throw error;
      positionId = data;
    }

    return ok({ positionId });
  } catch (e) {
    return rpcError(e);
  }
}
