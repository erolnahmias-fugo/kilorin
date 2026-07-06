/**
 * Kilorin demo seed script  —  `npm run seed`
 * ───────────────────────────────────────────────────────────────────────────
 * Populates the live Supabase project with a realistic, self-consistent demo
 * season so every screen (leaderboard, portfolio, market, casino, admin) has
 * something to render. It is **idempotent**: it upserts the durable identities
 * (auth users, the season, its members) and fully rebuilds the transactional
 * child data (ledger, offers, positions, logs) on every run, so re-running it
 * never double-counts a balance.
 *
 * INVARIANT — the ledger is the single source of truth for KLR balances. This
 * script NEVER writes a "balance" column (there is none). A member's liquid KLR
 * is `sum(ledger.amount)`; we compose ledger rows so those sums land on the
 * design's target numbers.
 *
 * Runs with the Supabase SERVICE ROLE (bypasses RLS). Requires
 * SUPABASE_SERVICE_ROLE_KEY — the script fails fast with a clear message if it
 * is missing.
 */

// ── Load env before anything reads it ───────────────────────────────────────
// `env.ts` reads process.env lazily (inside getters), so loading dotenv here —
// after the hoisted imports but before we ever call createAdminClient() — is
// sufficient. .env.local wins; .env is a fallback.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();

import { DateTime } from 'luxon';

import { createAdminClient } from '../src/lib/supabase/admin';
import type { Json, TablesInsert } from '../src/lib/supabase/database.types';
import { computeCalorieTarget } from '../src/lib/domain/calories';
import { generateShowcase, depositRate, leverageFor, type OfferDraft } from '../src/lib/domain/market';
import { STARTING_BALANCE, WEIGH_IN_REWARD, ISTANBUL_TZ } from '../src/lib/domain/constants';
import { CRYPTO_CATALOG } from '../src/lib/domain/market';
import type { Sex } from '../src/lib/domain/types';

// ── Guard: service role key is mandatory ────────────────────────────────────
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '\n✗ SUPABASE_SERVICE_ROLE_KEY is not set.\n' +
      '  The seed script writes with the service role (bypasses RLS).\n' +
      '  Get it from: Supabase dashboard → Project Settings → API → service_role\n' +
      '  then put it in .env.local as SUPABASE_SERVICE_ROLE_KEY=…\n',
  );
  process.exit(1);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('\n✗ NEXT_PUBLIC_SUPABASE_URL is not set (expected in .env.local).\n');
  process.exit(1);
}

const db = createAdminClient();

// A deterministic RNG so the generated showcase is stable across runs.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x4b4c5201); // "KLR" + version

// The season length used across calorie maths and interpolation.
const SEASON_WEEKS = 12;
const INVITE_CODE = 'K4F7';
const SEASON_NAME = 'Ofis Obezleri 🏢';

/** One demo player's fixed profile + the design's target liquid balance. */
interface MemberSeed {
  email: string;
  displayName: string;
  sex: Sex;
  age: number;
  heightCm: number;
  startKg: number;
  targetKg: number;
  currentKg: number;
  activityFactor: number;
  streakDays: number;
  suspicious: boolean;
  isAdmin: boolean;
  /** Target *liquid* KLR after all of this member's outflows (positions, penalties). */
  targetLiquid: number;
}

// Deniz is the season admin. Balances mirror the design's leaderboard vibe.
const MEMBERS: MemberSeed[] = [
  {
    email: 'deniz@kilorin.test', displayName: 'Deniz', sex: 'male', age: 34, heightCm: 178,
    startKg: 92, targetKg: 82, currentKg: 86, activityFactor: 1.55,
    streakDays: 21, suspicious: false, isAdmin: true, targetLiquid: 24000,
  },
  {
    email: 'burak@kilorin.test', displayName: 'Burak', sex: 'male', age: 41, heightCm: 182,
    startKg: 105, targetKg: 90, currentKg: 101, activityFactor: 1.375,
    streakDays: 3, suspicious: true, isAdmin: false, targetLiquid: 21800,
  },
  {
    email: 'emre@kilorin.test', displayName: 'Emre', sex: 'male', age: 29, heightCm: 175,
    startKg: 88, targetKg: 78, currentKg: 83, activityFactor: 1.725,
    streakDays: 12, suspicious: false, isAdmin: false, targetLiquid: 18900,
  },
  {
    email: 'seda@kilorin.test', displayName: 'Seda', sex: 'female', age: 31, heightCm: 165,
    startKg: 72, targetKg: 62, currentKg: 68, activityFactor: 1.55,
    streakDays: 8, suspicious: false, isAdmin: false, targetLiquid: 14200,
  },
  {
    email: 'can@kilorin.test', displayName: 'Can', sex: 'male', age: 26, heightCm: 180,
    startKg: 95, targetKg: 85, currentKg: 94, activityFactor: 1.2,
    streakDays: 0, suspicious: false, isAdmin: false, targetLiquid: 2900,
  },
];

// Emre's holdings (also the outflows subtracted from his gross earnings).
const EMRE_DEPOSIT_KLR = 3000; // vadeli mevduat principal
const EMRE_CRYPTO_KLR = 2000; // leveraged crypto position cost
const EMRE_WATCH_KLR = 3200; // Kolex Daytona prestige asset
// Burak's suspicion badge shaved a bit off his earnings (flavor).
const BURAK_PENALTY_KLR = 200;

// ── Small typed helpers around the Supabase client ──────────────────────────
function must<T>(res: { data: T | null; error: { message: string } | null }, ctx: string): T {
  if (res.error) throw new Error(`${ctx}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${ctx}: no data returned`);
  return res.data;
}

/** Ensure an auth user exists (idempotent) and return its id. */
async function ensureAuthUser(email: string, displayName: string, existing: Map<string, string>): Promise<string> {
  const found = existing.get(email.toLowerCase());
  if (found) return found;
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) throw new Error(`createUser(${email}): ${error?.message ?? 'no user'}`);
  return data.user.id;
}

export async function runSeed(): Promise<void> {
  console.log('▶ Kilorin seed — target:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // ── 1. Auth users (idempotent via listUsers) ─────────────────────────────
  const listedRes = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listedRes.error) throw new Error(`listUsers: ${listedRes.error.message}`);
  const listed = listedRes.data;
  const byEmail = new Map<string, string>();
  for (const u of listed.users) if (u.email) byEmail.set(u.email.toLowerCase(), u.id);

  const userIds = new Map<string, string>(); // email → auth uid
  for (const m of MEMBERS) {
    const id = await ensureAuthUser(m.email, m.displayName, byEmail);
    userIds.set(m.email, id);
  }
  console.log(`  ✓ ${MEMBERS.length} auth users ready`);

  // handle_new_user mirrors auth → public.users, but on reuse the display_name
  // may be stale; upsert it so the UI always shows the friendly name.
  const usersRows: TablesInsert<'users'>[] = MEMBERS.map((m) => ({
    id: userIds.get(m.email)!,
    email: m.email,
    display_name: m.displayName,
  }));
  must(await db.from('users').upsert(usersRows, { onConflict: 'id' }).select(), 'upsert users');

  // ── 2. Season (idempotent via unique invite_code) ────────────────────────
  const startDate = DateTime.now().setZone(ISTANBUL_TZ).minus({ weeks: 5 }).toFormat('yyyy-MM-dd');
  const now = new Date();
  const nextShowcaseAt = new Date(now.getTime() + 5 * 3600_000).toISOString();

  const seasonRow: TablesInsert<'seasons'> = {
    name: SEASON_NAME,
    invite_code: INVITE_CODE,
    admin_id: userIds.get('deniz@kilorin.test')!,
    length_weeks: SEASON_WEEKS,
    weigh_days: ['Pzt', 'Per'],
    start_date: startDate,
    status: 'active',
    next_showcase_at: nextShowcaseAt,
  };
  const seasonRes = await db.from('seasons').upsert(seasonRow, { onConflict: 'invite_code' }).select().single();
  if (seasonRes.error || !seasonRes.data) {
    throw new Error(`upsert season: ${seasonRes.error?.message ?? 'no data'}`);
  }
  const season = seasonRes.data;
  const seasonId = season.id;
  console.log(`  ✓ season "${SEASON_NAME}" (${INVITE_CODE}) starts ${startDate}`);

  // ── 3. Season members (idempotent via unique (season_id,user_id)) ─────────
  const memberRows: TablesInsert<'season_members'>[] = MEMBERS.map((m) => {
    const calc = computeCalorieTarget({
      sex: m.sex,
      age: m.age,
      heightCm: m.heightCm,
      currentKg: m.currentKg,
      targetKg: m.targetKg,
      activityFactor: m.activityFactor,
      seasonWeeks: SEASON_WEEKS,
    });
    return {
      season_id: seasonId,
      user_id: userIds.get(m.email)!,
      status: 'approved',
      is_admin: m.isAdmin,
      height_cm: m.heightCm,
      age: m.age,
      sex: m.sex,
      activity_factor: m.activityFactor,
      start_kg: m.startKg,
      target_kg: m.targetKg,
      current_kg: m.currentKg,
      daily_target_kcal: calc.dailyTarget,
      maintenance_kcal: calc.tdee,
      streak_days: m.streakDays,
      shield_inventory: m.displayName === 'Deniz' ? 1 : 0,
      suspicious: m.suspicious,
    };
  });
  const members = must(
    await db.from('season_members').upsert(memberRows, { onConflict: 'season_id,user_id' }).select(),
    'upsert season_members',
  );
  // email → member row
  const uidToEmail = new Map([...userIds].map(([e, u]) => [u, e]));
  const memberByEmail = new Map<string, (typeof members)[number]>();
  for (const row of members) memberByEmail.set(uidToEmail.get(row.user_id)!, row);
  const memberIds = members.map((m) => m.id);
  console.log(`  ✓ ${members.length} approved members (targets computed via Mifflin-St Jeor)`);

  // ── 4. RESET transactional data for this demo scope (makes re-runs clean) ──
  // Everything below is fully regenerated, so wipe the previous run's rows.
  await db.from('ledger').delete().eq('season_id', seasonId);
  await db.from('positions').delete().eq('season_id', seasonId);
  await db.from('casino_sessions').delete().eq('season_id', seasonId);
  await db.from('market_offers').delete().eq('season_id', seasonId);
  await db.from('dessert_bombs').delete().eq('season_id', seasonId);
  await db.from('daily_logs').delete().in('member_id', memberIds);
  await db.from('weigh_ins').delete().in('member_id', memberIds);
  await db.from('purchases').delete().in('member_id', memberIds);
  await db.from('notifications').delete().in('member_id', memberIds);
  console.log('  ✓ reset previous demo transactional rows');

  // ── 5. Ledger — compose rows so sum(amount) hits each target liquid ───────
  // gross earnings = targetLiquid + Σ(outflows). We insert earnings, then the
  // outflows (positions / penalties) net back down to targetLiquid.
  type LedgerSeed = { type: string; amount: number; description: string };

  function buildEarnings(targetLiquid: number, outflow: number): LedgerSeed[] {
    const gross = targetLiquid + outflow; // total positive KLR to distribute
    const rows: LedgerSeed[] = [
      { type: 'season_start', amount: STARTING_BALANCE, description: 'Sezon başlangıç bonusu' },
    ];
    let remaining = gross - STARTING_BALANCE;

    // Weigh-in rewards (fixed +300 each) — a chunk of realistic income.
    const weighCount = Math.max(0, Math.min(10, Math.floor((remaining * 0.25) / WEIGH_IN_REWARD)));
    for (let i = 0; i < weighCount; i++) {
      rows.push({ type: 'weigh_in_reward', amount: WEIGH_IN_REWARD, description: 'Tartı ödülü (+300)' });
      remaining -= WEIGH_IN_REWARD;
    }

    // One casino jackpot for flavor when there is enough headroom.
    if (remaining > 1500) {
      const c = Math.round(remaining * 0.2);
      rows.push({ type: 'casino_payout', amount: c, description: 'Kumarhane kazancı' });
      remaining -= c;
    }

    // Fill the rest with daily target rewards (100–300 range), last row exact.
    while (remaining > 320) {
      const a = 180 + Math.floor(rng() * 120); // 180–299
      rows.push({ type: 'daily_reward', amount: a, description: 'Günlük hedef ödülü' });
      remaining -= a;
    }
    if (remaining > 0) {
      rows.push({ type: 'daily_reward', amount: remaining, description: 'Günlük hedef ödülü' });
    }
    return rows;
  }

  // Outflow totals known up front (fixed constants above).
  const outflowByEmail: Record<string, number> = {
    'emre@kilorin.test': EMRE_DEPOSIT_KLR + EMRE_CRYPTO_KLR + EMRE_WATCH_KLR,
    'burak@kilorin.test': BURAK_PENALTY_KLR,
  };

  const ledgerRows: TablesInsert<'ledger'>[] = [];
  for (const m of MEMBERS) {
    const member = memberByEmail.get(m.email)!;
    const outflow = outflowByEmail[m.email] ?? 0;
    for (const e of buildEarnings(m.targetLiquid, outflow)) {
      ledgerRows.push({
        member_id: member.id,
        season_id: seasonId,
        type: e.type,
        amount: e.amount,
        description: e.description,
      });
    }
  }
  must(await db.from('ledger').insert(ledgerRows).select('id'), 'insert ledger (earnings)');

  // ── 6. Market showcase (generateShowcase + guaranteed variety) ────────────
  // generateShowcase() yields the bulk; we then guarantee the design's minimum:
  // at least one interest, one crypto, and one *trap* deposit variant.
  const drafts: OfferDraft[] = generateShowcase(rng, 20000);

  function manualInterest(trap: boolean): OfferDraft {
    const hours = trap ? 48 : 24;
    const rate = depositRate(hours, trap);
    return {
      type: 'interest',
      title: 'Vadeli Mevduat',
      subtitle: `${Math.round(hours / 24)} gün kilitli · erken çekimde faiz yanar`,
      lockHours: hours,
      rate,
      isTrap: trap,
      pricePerLot: 0,
      stock: null,
      minStake: 500,
      terms: { hours, rate },
    };
  }
  function manualCrypto(): OfferDraft {
    const inst = CRYPTO_CATALOG[0]; // bitcoin
    const lev = leverageFor('crypto');
    return {
      type: 'crypto',
      title: inst.name,
      subtitle: `Canlı fiyat · kaldıraç x${lev} · istediğin an sat`,
      instrumentId: inst.id,
      symbol: inst.symbol,
      leverage: lev,
      pricePerLot: 0,
      stock: 8,
      terms: { instrumentId: inst.id, symbol: inst.symbol, leverage: lev },
    };
  }

  if (!drafts.some((d) => d.type === 'crypto')) drafts.push(manualCrypto());
  if (!drafts.some((d) => d.type === 'interest' && !d.isTrap)) drafts.push(manualInterest(false));
  drafts.push(manualInterest(true)); // always a trap variant, visually identical

  const offerRows: TablesInsert<'market_offers'>[] = drafts.map((d) => ({
    season_id: seasonId,
    type: d.type,
    title: d.title,
    subtitle: d.subtitle,
    instrument_id: d.instrumentId ?? null,
    symbol: d.symbol ?? null,
    lock_hours: d.lockHours ?? null,
    rate: d.rate ?? null,
    is_trap: d.isTrap ?? false,
    leverage: d.leverage ?? null,
    price_per_lot: d.pricePerLot,
    stock: d.stock,
    min_stake: d.minStake ?? null,
    rent_per_day: d.rentPerDay ?? null,
    terms: d.terms as Json,
    active: true,
    spawn_at: now.toISOString(),
  }));
  const offers = must(await db.from('market_offers').insert(offerRows).select(), 'insert market_offers');
  const trapCount = offers.filter((o) => o.is_trap).length;
  console.log(
    `  ✓ ${offers.length} market offers (interest/crypto/trap guaranteed; ${trapCount} trap)`,
  );

  // First non-trap interest + first crypto offer, to back Emre's positions.
  const interestOffer = offers.find((o) => o.type === 'interest' && !o.is_trap) ?? null;
  const cryptoOffer = offers.find((o) => o.type === 'crypto') ?? null;

  // ── 7. Emre's holdings: a deposit, a leveraged crypto, a prestige watch ────
  const emre = memberByEmail.get('emre@kilorin.test')!;
  const depMatures = new Date(now.getTime() + 24 * 3600_000).toISOString();
  const depRate = interestOffer?.rate ?? depositRate(24, false);

  const positionRows: TablesInsert<'positions'>[] = [
    {
      member_id: emre.id, season_id: seasonId, offer_id: interestOffer?.id ?? null,
      type: 'interest', title: 'Vadeli Mevduat', amount_klr: EMRE_DEPOSIT_KLR,
      rate: depRate, lock_end: depMatures, status: 'open',
    },
    {
      member_id: emre.id, season_id: seasonId, offer_id: cryptoOffer?.id ?? null,
      type: 'crypto', title: cryptoOffer?.title ?? 'Bitcoin',
      instrument_id: cryptoOffer?.instrument_id ?? 'bitcoin', symbol: cryptoOffer?.symbol ?? 'BTC',
      amount_klr: EMRE_CRYPTO_KLR, lots: 0.5, leverage: leverageFor('crypto'), entry_price: 4000,
      status: 'open',
    },
    {
      member_id: emre.id, season_id: seasonId, offer_id: null,
      type: 'watch', title: 'Kolex Daytona', amount_klr: EMRE_WATCH_KLR, status: 'open',
    },
  ];
  must(await db.from('positions').insert(positionRows).select('id'), 'insert positions');

  // Matching ledger outflows so Emre's liquid nets to his target.
  const emreOutflows: TablesInsert<'ledger'>[] = [
    { member_id: emre.id, season_id: seasonId, type: 'deposit_open', amount: -EMRE_DEPOSIT_KLR, description: 'Vadeli mevduat', ref_type: 'offer', ref_id: interestOffer?.id ?? null },
    { member_id: emre.id, season_id: seasonId, type: 'market_buy', amount: -EMRE_CRYPTO_KLR, description: cryptoOffer?.title ?? 'Bitcoin', ref_type: 'offer', ref_id: cryptoOffer?.id ?? null },
    { member_id: emre.id, season_id: seasonId, type: 'market_buy', amount: -EMRE_WATCH_KLR, description: 'Kolex Daytona', ref_type: 'offer', ref_id: null },
  ];
  must(await db.from('ledger').insert(emreOutflows).select('id'), 'insert Emre outflows');
  console.log('  ✓ Emre holds a deposit, a leveraged crypto and a prestige watch');

  // ── 8. Burak's suspicion penalty outflow ──────────────────────────────────
  const burak = memberByEmail.get('burak@kilorin.test')!;
  must(
    await db.from('ledger').insert({
      member_id: burak.id, season_id: seasonId, type: 'suspicion_penalty',
      amount: -BURAK_PENALTY_KLR, description: 'Şüpheli rozeti cezası (-%10)',
    }).select('id'),
    'insert Burak penalty',
  );

  // ── 9. A few daily logs for Emre (some met target, some not) ──────────────
  const emreTarget = emre.daily_target_kcal ?? 1900;
  const logRows: TablesInsert<'daily_logs'>[] = [];
  // last 5 days: pattern of met (under target) / missed (over target)
  const pattern = [true, true, false, true, true]; // yesterday → 5 days ago
  for (let i = 0; i < pattern.length; i++) {
    const date = DateTime.now().setZone(ISTANBUL_TZ).minus({ days: i + 1 }).toFormat('yyyy-MM-dd');
    const met = pattern[i]!;
    // Distribute kcal across meals to land just under / just over target.
    const total = met ? emreTarget - 150 : emreTarget + 260;
    const breakfast = Math.round(total * 0.25);
    const lunch = Math.round(total * 0.35);
    const dinner = Math.round(total * 0.3);
    const snack = total - breakfast - lunch - dinner;
    logRows.push({
      member_id: emre.id, log_date: date,
      breakfast_kcal: breakfast, lunch_kcal: lunch, dinner_kcal: dinner, snack_kcal: snack,
      closed: true,
    });
  }
  must(
    await db.from('daily_logs').upsert(logRows, { onConflict: 'member_id,log_date' }).select('id'),
    'upsert Emre daily_logs',
  );
  console.log(`  ✓ ${logRows.length} daily logs for Emre`);

  // ── 10. Verify balances match design targets, then print a summary ────────
  const balances = must(
    await db.from('member_balances').select('member_id,balance').in('member_id', memberIds),
    'read member_balances',
  );
  const balByMember = new Map(balances.map((b) => [b.member_id, b.balance ?? 0]));

  console.log('\n─────────────────────────────────────────────');
  console.log('Kilorin seed complete ✅');
  console.log('─────────────────────────────────────────────');
  console.log(`Season   : ${SEASON_NAME}`);
  console.log(`Invite   : ${INVITE_CODE}`);
  console.log(`Members  :`);
  for (const m of MEMBERS) {
    const member = memberByEmail.get(m.email)!;
    const bal = balByMember.get(member.id) ?? 0;
    const badges = [m.isAdmin ? 'admin' : '', m.suspicious ? '🤨 şüpheli' : ''].filter(Boolean).join(' ');
    console.log(
      `  ${m.displayName.padEnd(6)} ${m.email.padEnd(22)} ` +
        `${String(bal).padStart(6)} KLR  🔥${m.streakDays}  ${badges}`,
    );
  }
  console.log('\nLog in (magic link / OTP — no passwords are set):');
  console.log('  1. Run `npm run dev` and open the app.');
  console.log('  2. Enter any demo email above; Supabase sends a magic link.');
  console.log('     In local/dev, view the link in Supabase dashboard → Authentication → Logs,');
  console.log('     or use the Auth "Magic Link" action to generate one.');
  console.log('  3. Deniz is the season admin; the rest are approved players.');
  console.log('');
}

// Auto-run only when executed as a script (`npm run seed`), not when imported
// by the /api/admin/seed route.
if (process.argv[1]?.includes('seed')) {
  runSeed().catch((err) => {
    console.error('\n✗ Seed failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
