# Kilorin 🪙

**Arcade fintech oyunu** — kapalı arkadaş grupları için multiplayer kilo verme oyunu
ve sanal ekonomi. Oyuncular günlük kalorilerini loglar, hedefin altında kaldıkça
**Kilorin (KLR)** kazanır ve bu parayla dönemsel yatırım fırsatları, kumarhane ve
dükkân üzerinden rekabetçi bir ekonomi oyunu oynar. Ciddi bir diyet uygulaması değil;
eğlenceli, hafif kumarbaz bir arkadaş grubu enerjisi — *"Kasa her zaman kazanır 😏"*.

Türkçe, mobile‑first bir **PWA**. Tema light/dark ("3c lila": lila zemin + altın coin).

## The concept — "arcade fintech"

Losing weight is the way you *earn* money in a game that otherwise feels like a
trading app. Every mechanic borrows a fintech gesture and pins it to one honest
economic anchor — **+10% expected value per 24h locked** — so deposits, leveraged
crypto, funds and even the casino all share the same fair EV, and the fun comes from
variance, timing and reading the fine print (some market offers are deliberate traps).
Balances are shown everywhere as **KLR** with a gold K‑coin; the whole thing is a
scoreboard for a friend group's season.

## Features

- **Onboarding with real calorie math** — Mifflin‑St Jeor BMR → TDEE → the daily
  target needed to hit your goal by season end, with a safety floor + "too aggressive"
  warning.
- **Daily log & day‑close** — four meal cards, a slot‑machine reward moment with a
  base + streak‑bonus breakdown, streak multiplier up to ×1.60, and an auto‑consuming
  **Streak Kalkanı** so one slip doesn't nuke your streak.
- **Weigh‑ins twice a week** — expected‑vs‑actual with a +0.4 kg tolerance, +300 KLR,
  and admin photo review.
- **Suspicion badge 🤨** — cross‑checks your logged eating against real weight change;
  under‑report and every earning takes a ‑10% cut until you weigh in clean.
- **Market (Piyasa)** — a 2–5 offer showcase that refreshes 3–4×/day: fixed deposits
  (with hidden trap variants), leveraged crypto/stock/fx/fund on **live prices**, real
  estate with 24h listed sales, and prestige cars & watches.
- **Casino (Kumarhane)** — 1/2/3/6h tables, a bounded heavy‑tail 0–10× multiplier with
  EV pinned to the anchor, dramatic server‑side reveal.
- **Shop (Dükkân)** — cosmetics, Cheat Day, AI Avatar, and the **Tatlı Bombası** you
  can throw at a friend (log a dessert in 24h or pay up).
- **Leaderboard & trophies** — net‑worth ranking; season‑end **Kilorin Şampiyonu**
  (richest) and **Dönüşüm Şampiyonu** (biggest transformation).
- **PWA + web‑push** notifications; everything runs on Europe/Istanbul time.

## Stack

Next.js 15 (App Router) · React 19 · Supabase (Postgres + RLS, Auth, Storage,
Realtime) · Tailwind CSS · Vercel + Vercel Cron · Luxon · web‑push · Zod.
Pure game logic lives in `src/lib/domain/`; the database schema, RPCs and RLS in
`supabase/migrations/`; balances are **always derived from an append‑only ledger**.

## Quickstart

```bash
npm install
cp .env.example .env.local        # fill SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, VAPID keys
npm run seed                      # demo season "Ofis Obezleri 🏢", invite code K4F7
npm run dev                       # http://localhost:3000
```

Full instructions — env vars, migrations, magic‑link login, Vercel deploy — are in
**[docs/SETUP.md](./docs/SETUP.md)**.

## Documentation

- **[docs/GAME-RULES.md](./docs/GAME-RULES.md)** — every rule, exactly as implemented.
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — stack, data model, RLS, price
  service, cron schedules.
- **[docs/SETUP.md](./docs/SETUP.md)** — install, configure, seed, run, deploy.
- **[docs/DESIGN-BUNDLE.md](./docs/DESIGN-BUNDLE.md)** — the original Claude Design
  handoff (prototype in `project/`, transcripts in `chats/`).

## Screenshots

_Coming soon — see the 21‑screen prototype in `project/Kilorin.dc.html` (screens
4a–4u, "3c lila")._

## Medical disclaimer

**Kilorin bir oyundur; tıbbi/medikal tavsiye vermez.** Kalori hedefleri ve tahminleri
oyun amaçlıdır. Beslenme veya sağlıkla ilgili kararlar için bir sağlık profesyoneline
danışın.
