# Kilorin — Oyun Kuralları (Game Rules)

This is the precise, implementation-accurate specification of every game rule.
Numbers here are the ones actually coded in `src/lib/domain/*` and
`supabase/migrations/*`. When rules and prose disagree, the code wins — this doc
is kept in sync with `src/lib/domain/constants.ts`.

> **Core invariant — the ledger is the single source of truth for balances.**
> No table stores a mutable KLR balance. A member's *liquid* balance is always
> `sum(public.ledger.amount)` for that member (see the `member_balances` view and
> the `member_balance(uuid)` function). Every earn, spend, stake, payout, penalty
> and reversal is an immutable ledger row. Never write a "balance" column — there
> isn't one.

Currency is **KLR** ("Kilorin"), shown everywhere with the gold K‑coin.

---

## 1. Onboarding & the calorie target

Source: `src/lib/domain/calories.ts`, `constants.ts`.

At join, a player enters sex, age, height (cm), current kg, target kg and picks an
activity level. The daily calorie target is computed as:

1. **BMR — Mifflin‑St Jeor:**
   `10·kg + 6.25·cm − 5·age + (male: +5 | female: −161)`.
2. **TDEE (maintenance):** `BMR × activityFactor`. Activity factors
   (`ACTIVITY_LEVELS`): sedentary 1.2, light 1.375, moderate 1.55, active 1.725,
   very active 1.9.
3. **Required deficit for the goal:** the player must lose `currentKg − targetKg`
   kg by season end. At **7700 kcal per kg** (`KCAL_PER_KG`), the total deficit is
   `kgToLose × 7700`, spread over `seasonWeeks × 7` days → a per‑day deficit.
4. **Raw daily target:** `TDEE − requiredDailyDeficit`.
5. **Floor clamp + warning:** the target is clamped to a sex floor
   (`CALORIE_FLOOR`): **1200 kcal (female)**, **1500 kcal (male)**. If the raw
   target is below the floor, it is raised to the floor and `clamped = true` — this
   drives the "bu hedef fazla agresif" warning screen. `suggestSaferTarget()`
   back‑solves a less aggressive target kg that lands the daily target at the floor.
6. The final `dailyTarget` is rounded to the nearest 10 kcal. The result also
   reports `estWeeklyLossKg` and `estEndKg` computed at the *clamped* target, so the
   projection is honest about what a floored goal actually achieves.

Stored on `season_members`: `daily_target_kcal` (= `dailyTarget`) and
`maintenance_kcal` (= `TDEE`). Membership starts as `pending` until the season
admin approves it.

## 2. Starting balance

Source: `constants.ts` `STARTING_BALANCE = 100`.

On approval each member gets **100 KLR** as a single `season_start` ledger row.

## 3. Daily log & day‑close

Sources: `src/lib/domain/rewards.ts`, `src/lib/time.ts`, day‑close cron.

- A player logs four meals (breakfast/lunch/dinner/snack) as kcal, optionally with
  photos, into `daily_logs` (unique per member per day).
- **Day close is 23:59 Istanbul time** (`dayCloseInstant` = local `endOf('day')`).
  A cron closes the day and resolves the reward via `resolveDailyReward`.
- **Target met** (`totalKcal ≤ targetKcal`, or a Cheat Day is active):
  - **Base reward:** uniform integer in **[100, 300]** (`DAILY_REWARD_MIN/MAX`).
  - **Streak multiplier:** `1 + 0.02 × min(streakDays, 30)` (`STREAK_STEP = 0.02`,
    `STREAK_CAP_DAYS = 30`), where `streakDays` is the streak *before* today. So the
    multiplier tops out at **×1.60** after 30 days.
  - **Split shown to the player:** `base` + `streakBonus`, where
    `streakBonus = round(base × (multiplier − 1))` — e.g. "Temel: 220 + Streak
    bonusu: +26 (%12)". Ledger records this as `daily_reward` (base) and, when
    non‑zero, `streak_bonus`.
  - Streak increments by 1.
- **Target missed:**
  - **With a Streak Kalkanı (shield) in inventory:** the shield is auto‑consumed
    (`shieldConsumed = true`), the streak is **preserved** (not incremented), no
    reward. Outcome `shielded`.
  - **Without a shield:** streak resets to **0**, no reward, **no KLR penalty**
    (missing a day never costs money). Outcome `broken`.
- **Suspicion penalty on earnings:** if the member carries the suspicion badge, any
  positive daily earning is reduced by **10%** (`SUSPICION_PENALTY = 0.1`), applied
  as `suspicionPenalty = round(gross × 0.10)` and recorded so the total nets out.

## 4. Weigh‑ins

Sources: `src/lib/domain/suspicion.ts` (`expectedWeight`), `constants.ts`, weigh‑in
API/cron, `weigh_ins` table.

- Weigh‑ins are enabled on the season's `weigh_days` (default `['Pzt','Per']`, i.e.
  **twice a week**). The player uploads a scale photo and a weight.
- **Expected weight** at any point is a **linear interpolation** from `start_kg` to
  `target_kg` across the season: `startKg + (targetKg − startKg) × fraction`, where
  `fraction` is the elapsed season fraction (`seasonFraction` in `time.ts`).
- **Tolerance & reward:** if `actual ≤ expected + 0.4 kg` (`WEIGH_IN_TOLERANCE_KG`)
  the weigh‑in earns **+300 KLR** (`WEIGH_IN_REWARD`), recorded as `weigh_in_reward`.
  The tolerance band is the "green up to +0.4 kg" indicator.
- **Admin rejection reverses it:** a season admin can reject a weigh‑in photo. That
  sets `admin_rejected = true` and posts a `weigh_in_reversal` ledger row that undoes
  the reward.

## 5. Suspicion badge 🤨

Source: `src/lib/domain/suspicion.ts` (`evaluateSuspicion`).

Kilorin cross‑checks *declared eating* against *real weight change* between two
weigh‑ins:

- **Declared deficit** = `Σ maintenance_kcal − Σ consumed_kcal` over the days
  between the two weigh‑ins. **Expected loss** = `declaredDeficit / 7700` kg.
- **Actual loss** = `prevWeight − currWeight`.
- **Gap** = `expectedLoss − actualLoss`. If the gap exceeds **1.0 kg**
  (`SUSPICION_THRESHOLD_KG`) — i.e. the player lost noticeably less than their logged
  intake implies (they under‑reported food) — the **suspicious** badge turns on.
- While the badge is active, **all KLR earnings are cut by 10%** (see §3, and
  `applySuspicion` in `rewards.ts`).
- The badge is **cleared** by a consistent weigh‑in (a later evaluation whose gap is
  within the threshold).

## 6. Market (Piyasa / Fırsatlar)

Sources: `src/lib/domain/market.ts`, `constants.ts`, `src/lib/prices/index.ts`,
`buy_offer` / `sell_position` / `list_position` RPCs (`0002_functions.sql`).

**The universal EV anchor is +10% expected return per 24h locked** (`EV_24H = 0.1`).
Every yield instrument is tuned to that anchor.

### Showcase refresh
- Each showcase is **2–5 offers** (`generateShowcase`). It always contains at least
  one yield/market instrument; it may also include a prestige or real‑estate piece.
- The showcase **refreshes 3–4 times a day at random times.** The next refresh
  instant lives in `seasons.next_showcase_at`; a cron spawns a fresh showcase when
  that time passes and re‑randomizes the next one.

### Instrument families
- **Vadeli mevduat (interest / fixed deposit):** locks for 24/48/72h, no leverage.
  Rate anchors to +10%/24h with a mild term premium (`depositRate`): 24h → 10%,
  72h → ~33%. Min stake 500 KLR. **Trap variants:** with probability **20%**
  (`DEPOSIT_TRAP_PROBABILITY`) a deposit pays only ~30% of the fair rate. Traps are
  **visually indistinguishable** from good offers — the player must read the terms.
- **Crypto / stock / fx / fund (carry + leverage model):** priced **live per lot**
  (see §9). Leverage bands (`LEVERAGE`): crypto ×3, stock ×2, fx ×1.3, fund ×1.2.
  Mark‑to‑market value (`positionValue`):
  `value = entry × (1 + leverage × priceChangePct) + hourlyCarry × hoursHeld`,
  floored at 0. The per‑hour carry (`hourlyCarry = entry × 0.10 / 24`) is what makes
  the position's EV hit the +10%/24h anchor. **Liquidation:** if value reaches 0 the
  position is liquidated. Selling is instant at the server‑computed value
  (`sell_position`), minus a 1% buy fee charged at purchase.
- **Real estate:** dynamic price = **50–80% of the buyer's net worth**
  (`REAL_ESTATE_PRICE_BAND`), rounded, min 2000 KLR. Pays daily rent. Selling is a
  **24‑hour listed sale** (`list_position` sets `list_end = now + 24h`; a cron
  settles it — `LISTING_SETTLE_HOURS`).
- **Prestige assets (car / watch):** one‑off cosmetic holdings displayed on the
  profile. Priced around a catalog base (`PRESTIGE_CATALOG`, e.g. Kolex Daytona 3200,
  Patep Nautilus 5200, Cayenne S 8800, M4 Competition 7400) with ±10% jitter.

### Atomic purchase
`buy_offer` is a single `SECURITY DEFINER` transaction: it re‑reads the offer
`FOR UPDATE`, validates availability/expiry/min‑stake/stock, checks the ledger
balance covers `cost + fee`, decrements stock (closing single‑unit offers), writes
the negative ledger row **and** inserts the position — all or nothing.

## 7. Casino (Kumarhane)

Source: `src/lib/domain/casino.ts`, `casino_sit` RPC, reveal cron.

- Durations and ceilings (`CASINO_DURATIONS`): **1h → max ×2, 2h → ×4, 3h → ×6,
  6h → ×10.** Sitting stakes KLR immediately (`casino_stake` ledger row).
- **Payout distribution:** `multiplier = maxMult · U^a`, `U ~ Uniform(0,1)`, with
  the exponent chosen so `E[multiplier] = maxMult / (a+1)` equals the
  **duration‑scaled EV anchor** `1 + 0.10 × hours/24` (`casinoTargetEV`). Thus
  `a = maxMult / targetEV − 1`. This yields an **exact EV pinned to the anchor**, a
  hard **[0, maxMult]** range, and a **heavy tail** that gets heavier as the ceiling
  rises (a 6h table is mostly near‑zero with a rare ×10 jackpot). The reveal reports
  a percentile ("%N'lik dilim").
- The roll is resolved **server‑side at reveal time only** (a cron flips
  `active → revealed`), then the payout (`casino_payout`) is credited on collect.

## 8. Shop (Dükkân)

Sources: `constants.ts` `SHOP`, `shop_purchase` RPC (`0003_shop_rpc.sql`),
`0006_seed_shop.sql`.

- **Cosmetics:** Dandik Şapka (50), Neon Çerçeve (300), Altın İsim (1200), Elmas
  Rozet (5000). Purely visual; the owned key is appended to `cosmetics`.
- **Streak Kalkanı (400 KLR):** max **2** in inventory (`maxInventory`). Auto‑consumes
  on a missed day to preserve the streak (§3). Purchase blocked when inventory is full.
- **Cheat Day (1000 KLR):** **once per week** (`perWeek: 1`, week = `date_trunc('week')`).
  Marks the day as target‑met regardless of intake and inserts/updates today's log
  with `cheat_day = true`.
- **Tatlı Bombası / Dessert Bomb (500 KLR):** the attacker targets another approved
  member, who then has a **24‑hour window** (`windowHours`) to log a photographed
  dessert. On failure the victim transfers **500 KLR** to the attacker
  (`penaltyTransfer`, both sides posted via `dessert_bomb_penalty`). Creates a
  `dessert_bombs` row with a 24h deadline; a cron resolves it.
- **AI Avatar (750 KLR):** unlocks the AI avatar interface (photo upload →
  generated avatar). Sets `ai_avatar_url` (initially `pending`).

All shop buys go through the atomic `shop_purchase` RPC: it checks the balance,
applies the per‑item effect, writes the `shop_purchase` (or bomb/transfer) ledger
row and records the `purchases` row in one transaction.

## 9. Live prices

Source: `src/lib/prices/index.ts`.

Market instruments are priced live and normalized into game‑scale KLR per lot:
crypto via **CoinGecko**, fx via **Frankfurter**; stocks/funds have no free feed and
are always simulated. Each quote carries `source` (`live` / `cache` / `sim`) and a
`delayed` flag. A 90‑second in‑memory cache sits in front; on a dead API the service
**never throws** — it degrades to the last cache or a deterministic random‑walk
(`simFactor`, a seeded sum of sines, identical across server instances) and marks the
quote **delayed** ("fiyat gecikmeli" indicator).

## 10. Leaderboard & net worth

Source: `src/lib/domain/networth.ts`.

`netWorth = liquid + deposits + positions + prestige` where:
- **liquid** = ledger balance,
- **deposits** = Σ current value of open fixed deposits (`depositValue`, principal
  accrued linearly to maturity),
- **positions** = Σ mark‑to‑market value of open market positions (§6),
- **prestige** = Σ current value of real‑estate / car / watch holdings.

The leaderboard ranks by net worth and shows avatar, streak and the 🤨 badge.

## 11. Season end — trophies

- **Kilorin Şampiyonu:** highest **net worth** at season end.
- **Dönüşüm Şampiyonu (Transformation):** highest `transformationScore =
  (startKg − endKg) / (startKg − targetKg)` — the fraction of the *planned* loss
  actually achieved (`transformationScore`, clamped to 0 when the plan was non‑positive).

---

### Ledger types reference

`season_start`, `daily_reward`, `streak_bonus`, `weigh_in_reward`,
`weigh_in_reversal`, `market_buy`, `market_sell`, `deposit_open`, `deposit_mature`,
`casino_stake`, `casino_payout`, `shop_purchase`, `dessert_bomb_stake`,
`dessert_bomb_penalty`, `listing_settle`, `suspicion_penalty`, `admin_adjust`
(see `src/lib/domain/types.ts`). Every one is an append‑only row; balances are the
running sum.
