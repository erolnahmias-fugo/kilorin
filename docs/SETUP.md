# Kilorin — Setup

Get Kilorin running locally and deployed to Vercel. For what the app *does* see
[GAME-RULES.md](./GAME-RULES.md); for how it's built see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Prerequisites

- **Node 20+** and npm.
- A **Supabase project**. One already exists for this app:
  ref `ctnwrglvbvpzavuvyncg` (eu-central-1). Use it, or create your own.
- Optional: the **Supabase CLI** (`npm i -g supabase`) if you want to push migrations
  or regenerate types.

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy the example and fill it in:

```bash
cp .env.example .env.local
```

`.env.local` is already pointed at the live project's URL and anon key. You must fill:

| Variable | Where to get it |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | **Supabase dashboard → Project Settings → API → `service_role` secret.** Server‑only; never expose it to the client. Required for `npm run seed` and cron. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same **API** settings page (URL + publishable/anon key). Pre‑filled for the live project. |
| `CRON_SECRET` | Any long random string. Guards `/api/cron/*` and is set as a Vercel Cron header. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Generate a keypair: `npx web-push generate-vapid-keys`. Put the public key in the `NEXT_PUBLIC_` var and the private key in `VAPID_PRIVATE_KEY`. |
| `VAPID_SUBJECT` | A `mailto:` address for push (default `mailto:admin@kilorin.app`). |
| `ANTHROPIC_API_KEY` | *Optional* — AI Avatar generation. |
| `COINGECKO_API_KEY` | *Optional* — the public CoinGecko API works key‑less (rate‑limited). |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; your deployed URL in prod. |

## 3. Apply the database migrations

The migrations in `supabase/migrations/` are the source of truth (schema, functions,
RLS, grants, shop seed).

- **They are already applied on the live project** (`ctnwrglvbvpzavuvyncg`). If you're
  using it, skip this step.
- For your own project, link and push:

  ```bash
  supabase link --project-ref <your-ref>
  supabase db push
  ```

## 4. Seed demo data

```bash
npm run seed
```

This idempotently creates 5 demo players, the **"Ofis Obezleri 🏢"** season (invite
code **`K4F7`**, admin Deniz), computed calorie targets, a ledger that lands each
player on the design's target balances, a market showcase (with a trap deposit),
Emre's holdings, and a few daily logs. Re‑running it is safe — it rebuilds the
transactional data rather than duplicating it. It requires `SUPABASE_SERVICE_ROLE_KEY`
and fails with a clear message if that's missing. The script prints the demo emails,
the invite code and how to log in.

> Demo users have no password — log in via **magic link / OTP**. In the Supabase
> dashboard, **Authentication → Users** (generate a magic link) or **Authentication →
> Logs** (view the emitted link) lets you sign in as any demo player during dev.

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000. Other useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest (domain unit tests)
npm run db:types    # regenerate src/lib/supabase/database.types.ts from the linked project
```

## 6. Deploy to Vercel

1. Import the repo into Vercel.
2. Add **all** the environment variables from step 2 to the Vercel project (Production
   + Preview). In particular set `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, the VAPID
   keys and `NEXT_PUBLIC_APP_URL` (your deployed URL).
3. **Cron is auto‑picked from `vercel.json`** — the day‑close (21:05 UTC) and the
   every‑15‑minutes maintenance job register automatically. Make sure `CRON_SECRET` is
   set so the cron routes accept the scheduled requests.
4. Deploy.

## Note on live prices

The market uses CoinGecko (crypto) and Frankfurter (fx) for live quotes.
**These hosts may be network‑restricted** in some environments (CI, sandboxes, certain
regions). When a feed is unreachable the price service falls back to a deterministic
**simulated** price and flags it as **delayed** — the UI shows a **"fiyat gecikmeli"**
indicator. The game stays fully playable on simulated prices; stocks and funds are
always simulated since they have no free key‑less feed.
