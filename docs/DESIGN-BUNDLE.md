# Design Bundle — original handoff context

This project began as a **Claude Design** (claude.ai/design) handoff. The design was
mocked up in HTML/CSS/JS by an AI design tool, then exported so a coding agent could
build it for real. That original context is preserved here so it isn't lost now that
the repo root README describes the real application.

## What's in the bundle

- **`project/Kilorin.dc.html`** — the primary design file (the user had it open at
  handoff). It contains the full interactive prototype: **21 screens (4a–4u)** in the
  final **"3c lila"** palette (lilac ground + gold KLR coin), inside iPhone frames,
  with a light/dark theme toggle. The casino stays dark‑neon in every theme.
- **`chats/chat1.md`** — the design conversation transcript. This is where the intent
  lives: the "arcade fintech" concept, the palette iteration (toxic neon → nightclub →
  terminal → turquoise → **lilac 3c**), the "1a body + 1b giant hero balance" decision,
  and the final list of all 21 screens.

## The 21 screens (Turn 4, "3c lila")

- **Onboarding:** 4a invite code · 4b profile · 4c target result · 4d unhealthy‑goal
  warning · 4e awaiting admin approval
- **Daily loop:** 4f home · 4g reward moment (coin rain) · 4h streak broken · 4i shield
  engaged · 4j weigh‑in day
- **Economy:** 4k market (3rd card is a trap, visually indistinguishable) · 4l buy
  modal · 4m portfolio + 🤨 penalty banner
- **Casino:** 4n table setup · 4o active timer · 4p ×3.2 reveal — dark in every theme
- **Other:** 4q shop · 4r dessert‑bomb victim · 4s leaderboard (two trophies) ·
  4t profile · 4u admin panel

## How to use it

The HTML files are **prototypes, not production code** — recreate their visual output
in the real Next.js + Tailwind app; don't copy their internal structure. Read the HTML
and CSS directly for dimensions, colors and layout rules (no need to render them in a
browser). The design's numbers and game rules have been formalized in
[GAME-RULES.md](./GAME-RULES.md) and implemented in `src/lib/domain/`.

> Note: `project/` is excluded from TypeScript compilation (see `tsconfig.json`); it's
> reference material, not part of the build.
