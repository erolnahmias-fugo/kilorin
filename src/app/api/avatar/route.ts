import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { fail, ok, requireApprovedMember } from '@/lib/api';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  photoPath: z.string().min(1),
  description: z.string().optional(),
});

/** Placeholder avatar until real image generation is wired in. */
function placeholderAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
}

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

  let recipe = 'Stilize, canlı renkli, minimal avatar.';
  const key = env.anthropicKey();
  if (key) {
    try {
      const anthropic = new Anthropic({ apiKey: key });
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content:
              'Bir kilo verme oyunu için stilize avatar üretecek kısa bir görsel "tarif" (prompt) yaz. ' +
              `Kullanıcı açıklaması: ${parsed.description ?? 'yok'}. Tek paragraf, Türkçe.`,
          },
        ],
      });
      const block = msg.content.find((b) => b.type === 'text');
      if (block && block.type === 'text') recipe = block.text.trim();
    } catch (e) {
      console.error('avatar recipe generation failed', e);
    }
  }

  // TODO: feed `recipe` + `photoPath` into an image-generation service and store
  // the resulting hosted image URL. For now we store a deterministic placeholder.
  const avatarUrl = placeholderAvatar(memberId);
  await admin.from('season_members').update({ ai_avatar_url: avatarUrl }).eq('id', memberId);

  return ok({ avatarUrl, recipe, generated: !!key });
}
