# Kilorin — Architecture

A concise map of how the app is put together. For the game rules themselves see
[GAME-RULES.md](./GAME-RULES.md); for local setup see [SETUP.md](./SETUP.md).

## Stack

- **Next.js 15 (App Router)** + **React 19** — UI and server API routes.
- **Supabase** — Postgres (with **Row Level Security**), **Auth** (magic‑link /
  OTP), **Storage** (meal & scale photos, avatars), **Realtime** (live balances,
  casino reveals, leaderboard).
- **Tailwind CSS** — the "3c lila" (lilac + gold) design language, light/dark themes.
- **Vercel** — hosting + **Vercel Cron** for scheduled game logic.
- **Luxon** — all time logic runs in **Europe/Istanbul**; day‑close, weigh‑days and
  season fraction are computed in that zone (`src/lib/time.ts`).
- **web-push** (VAPID) + a service worker — PWA install + push notifications.
- **Zod** — request validation at the API boundary.
- **@anthropic-ai/sdk** — optional AI Avatar recipe/image generation.

Live Supabase project ref: **`ctnwrglvbvpzavuvyncg`** (region **eu-central-1**),
URL `https://ctnwrglvbvpzavuvyncg.supabase.co`.

## Directory map

```
src/
  app/                 Next.js App Router: pages + /api route handlers
    api/               server mutations (auth user → resolve member → RPC)
      cron/            Vercel Cron targets (guarded by CRON_SECRET)
  lib/
    domain/            PURE game logic, no I/O — the rulebook in code
      constants.ts       every tunable number (EV anchor, floors, prices…)
      calories.ts        Mifflin-St Jeor → TDEE → target (+ floor clamp)
      rewards.ts         daily-close resolution, streak multiplier, suspicion cut
      suspicion.ts       declared-deficit vs real-change badge; expected weight
      market.ts          instrument catalogs + generateShowcase + yield/carry maths
      networth.ts        deposit accrual, net worth, transformation score
      casino.ts          bounded heavy-tail multiplier with EV pinned to anchor
      types.ts           domain types + ledger type union
    supabase/
      admin.ts           service-role client (bypasses RLS) — server only
      server.ts          per-request server client (user session, RLS-scoped)
      client.ts          browser client
      database.types.ts  generated table/RPC types
    prices/index.ts    live price proxy (CoinGecko/Frankfurter) + cache + sim
    game/              server-side orchestration (session, portfolio, notify)
    time.ts            Istanbul-zone date/weekday/season-fraction helpers
    env.ts             centralized env access with clear "missing var" errors
    push.ts            web-push helpers
  middleware.ts        Supabase session refresh on navigation
supabase/migrations/   the source of truth for schema, RPCs, RLS, grants
scripts/seed.ts        idempotent demo data (npm run seed)
docs/                  this documentation
project/, chats/       the original Claude Design handoff bundle (see DESIGN-BUNDLE.md)
```

## Data model overview

All tables live in `public` (schema in `supabase/migrations/0001_schema.sql`):

- **users** — mirror of `auth.users` (id, email, display_name, avatar). Populated by
  the `handle_new_user` trigger.
- **seasons** — a closed friend‑group game: invite_code, admin, length, weigh_days,
  start_date, status, `next_showcase_at`.
- **season_members** — a user in a season: profile (height/age/sex/activity), start/
  target/current kg, computed `daily_target_kcal` + `maintenance_kcal`, `streak_days`,
  `shield_inventory`, `suspicious`, `cheat_day_last`, cosmetics, avatar.
- **daily_logs** — one row per member per day (four meals + photos, closed flag).
- **ledger** — **append‑only** money movements; balances are `sum(amount)`. The
  `member_balances` view and `member_balance(uuid)` function expose the derived total.
- **weigh_ins** — one per member per weigh date (weight, photo, expected, reward flag,
  admin_rejected, suspicion snapshot).
- **market_offers** — the current showcase per season (type, terms, rate, leverage,
  stock, is_trap, active, spawn_at).
- **positions** — owned assets (deposits, leveraged instruments, real estate, prestige)
  with status `open/closed/liquidated/listed/matured`.
- **casino_sessions** — stake, hours, end_at, resolved multiplier/payout/percentile.
- **shop_items** / **purchases** — catalog + purchase history.
- **dessert_bombs** — attacker/target/deadline/status.
- **notifications** / **push_subscriptions** — in‑app + web‑push delivery.

## RLS model

Every table has RLS enabled (`0004_rls.sql`). The shape is **group‑scoped reads,
owner writes, privileged mutations via RPC**:

- **Reads are scoped to your seasons.** Helper `SECURITY DEFINER` functions dodge
  policy recursion: `approved_season_ids()`, `admin_season_ids()`, `my_member_ids()`,
  `visible_member_ids()`. Members, daily logs, weigh‑ins and market offers are visible
  to everyone approved in the same season (the group can see each other's photos and
  weights). The **ledger, positions, casino sessions and purchases are private to the
  owner**.
- **Writes are owner‑gated.** You can insert/update only your own member, logs and
  weigh‑ins; season admins can also update members (approvals) and weigh‑ins (reject).
- **Money‑moving mutations never happen from the client.** They are `SECURITY DEFINER`
  RPCs — `buy_offer`, `sell_position`, `list_position`, `casino_sit`, `shop_purchase`
  (plus `member_balance`, `assert_owner`) — that treat a `null auth.uid()` (the service
  role) as trusted. `0007_grants.sql` **revokes** these from `public/anon/authenticated`
  and grants them **only to `service_role`**. So every mutation flows:
  **client → Next.js server API route (authenticates the user, resolves the member id)
  → service‑role RPC.** `assert_owner` inside each RPC re‑checks ownership so a server
  route can't act on someone else's member by mistake.
- The `member_balances` view runs with `security_invoker`, so it only ever returns the
  caller's own rows under RLS.

## Price service

`src/lib/prices/index.ts` resolves KLR lot prices:

1. **Cache** — 90 s in‑memory map; a hit returns `source: 'cache'`.
2. **Live** — crypto → CoinGecko `simple/price`, fx → Frankfurter `latest` (6 s
   timeout). Live USD values are normalized into game scale via per‑family bases and
   per‑instrument baselines. `source: 'live'`, `delayed: false`.
3. **Fallback** — on any failure it degrades to the last cache or a **deterministic
   random‑walk** (`simFactor`: a seeded sum of incommensurable sines, identical across
   server instances, no `Math.random`). `source: 'sim'`, `delayed: true` →
   the UI shows the **"fiyat gecikmeli"** badge.

Stocks and funds have no free key‑less feed and are **always simulated**. `getPrices`
never throws.

## Cron jobs

Vercel Cron hits `/api/cron/*` routes (guarded by `CRON_SECRET`). All game time is
Europe/Istanbul; Vercel Cron schedules are **UTC**:

| Job | UTC schedule | Istanbul | Purpose |
| --- | --- | --- | --- |
| **Day close** | `5 21 * * *` (21:05 UTC) | 00:05 | Resolve the previous day's logs: daily rewards, streak update, shield auto‑consume (§3 of GAME-RULES). |
| **Showcase / maturities / dessert bombs** | `*/15 * * * *` (every 15 min) | — | Spawn new showcases when `next_showcase_at` passes; mature deposits and settle 24h listings; reveal casino sessions past `end_at`; expire dessert bombs and apply the transfer. |

> Istanbul is UTC+3 year‑round, so 21:05 UTC = 00:05 next day local — the first tick
> after the 23:59 day‑close boundary.

## PWA & web‑push

The app installs as a PWA (manifest + service worker). Push uses VAPID keys
(`NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, subject `VAPID_SUBJECT`);
subscriptions are stored in `push_subscriptions` and sent via `web-push`
(`src/lib/push.ts`). Notifications back day‑close results, weigh‑in reminders, casino
reveals and dessert‑bomb deadlines.
