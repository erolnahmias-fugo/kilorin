'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Coin } from '../Coin';
import { ProgressBar } from '../ProgressBar';
import { Countdown } from '../Countdown';
import { MealSheet } from './MealSheet';
import { RewardModal } from './RewardModal';
import { formatKLR } from '@/lib/money';
import type { HomeView, MealKey, MealView } from '../demo';

export type HomeState = 'normal' | 'streak-broken' | 'shield';

export function HomeScreen({
  data,
  state = 'normal',
  reward = false,
}: {
  data: HomeView;
  state?: HomeState;
  reward?: boolean;
}) {
  const [meals, setMeals] = useState<MealView[]>(data.meals);
  const [editing, setEditing] = useState<MealKey | null>(null);
  const [showReward, setShowReward] = useState(reward);

  const todayKcal = meals.reduce((s, m) => s + m.kcal, 0);
  const margin = data.targetKcal - todayKcal;
  const pct = (todayKcal / data.targetKcal) * 100;

  if (state === 'shield') return <ShieldActivated streakDays={data.streakDays} multiplier={data.multiplier} />;

  const broken = state === 'streak-broken';

  return (
    <div className="flex-1 flex flex-col gap-[13px]" style={{ padding: '62px 18px 0' }}>
      {/* Balance hero */}
      <div className="text-center relative" style={{ padding: '6px 0 4px' }}>
        {!broken && (
          <div
            className="absolute pointer-events-none bg-glow"
            style={{ top: -40, left: '50%', transform: 'translateX(-50%)', width: 280, height: 190 }}
          />
        )}
        <div className="flex justify-center items-center gap-2">
          <span className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.18em' }}>
            BAKİYE
          </span>
          {broken ? (
            <span className="inline-flex items-center whitespace-nowrap bg-track text-t45 rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px' }}>
              🕯 0 gün · x1,00
            </span>
          ) : (
            <span className="inline-flex items-center whitespace-nowrap bg-acc-soft text-accent rounded-full" style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px' }}>
              🔥 {data.streakDays} gün · x{data.multiplier.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
        <div className="flex justify-center items-center gap-3" style={{ marginTop: 10 }}>
          <Coin size={38} />
          <span className="font-display tnum num-glow" style={{ fontSize: 48, lineHeight: 1, fontWeight: 700, letterSpacing: '-.02em' }}>
            {formatKLR(data.balance)}
          </span>
        </div>
        <div className="font-display text-gold" style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>
          KLR{' '}
          {!broken && data.todayDelta !== 0 && (
            <span className={data.todayDelta > 0 ? 'text-accent' : 'text-bad'} style={{ fontFamily: 'var(--font-manrope)', fontSize: 12, fontWeight: 600, marginLeft: 8 }}>
              {data.todayDelta > 0 ? '▲ +' : '▼ −'}{formatKLR(Math.abs(data.todayDelta))} bugün
            </span>
          )}
        </div>
      </div>

      {broken ? (
        <>
          <div className="bg-bad-soft border-[1.5px] border-bad rounded-[20px] text-center" style={{ padding: 18 }}>
            <div style={{ fontSize: 30 }}>💔</div>
            <div className="font-display text-bad" style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>
              Streak kırıldı
            </div>
            <div className="text-t80" style={{ fontSize: 12.5, lineHeight: 1.5, fontWeight: 500, marginTop: 6 }}>
              Dün hedefi <b>240 kcal</b> aştın. {data.streakDays} günlük alev söndü, çarpan x1,00&apos;a döndü.
            </div>
            <div className="flex justify-center gap-[6px]" style={{ marginTop: 12, fontSize: 11.5, fontWeight: 600 }}>
              <span className="bg-surface border border-border rounded-full text-t55" style={{ padding: '5px 12px' }}>
                🔥 {data.streakDays} → 0
              </span>
              <span className="bg-surface border border-border rounded-full text-t55" style={{ padding: '5px 12px' }}>
                x{data.multiplier.toFixed(2).replace('.', ',')} → x1,00
              </span>
            </div>
          </div>
          <Link
            href="/shop"
            className="flex items-center gap-3 bg-surface border border-acc-border rounded-[16px] shadow-card"
            style={{ padding: '12px 16px' }}
          >
            <span style={{ fontSize: 20 }}>🛡</span>
            <div className="flex-1">
              <div className="text-accent" style={{ fontSize: 12.5, fontWeight: 700 }}>
                Bir dahakine: Streak Kalkanı
              </div>
              <div className="text-t55" style={{ fontSize: 11, fontWeight: 500 }}>
                1 kaçamağı affeder · Dükkânda 400 KLR
              </div>
            </div>
            <span className="bg-accent text-btntext rounded-full" style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px' }}>
              Al
            </span>
          </Link>
          <div className="text-center text-t45" style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>
            Bugün temiz kapat, alev yeniden yansın. 🔥1&apos;den herkes geçti.
          </div>
        </>
      ) : (
        <>
          {/* Calorie progress */}
          <div className="bg-surface border border-border rounded-[18px] shadow-card" style={{ padding: '14px 16px' }}>
            <div className="flex justify-between items-baseline">
              <span className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em' }}>
                BUGÜNKÜ KALORİ
              </span>
              <span className="font-display tnum" style={{ fontSize: 13, fontWeight: 700 }}>
                <span className="text-accent">{formatKLR(todayKcal)}</span>
                <span className="text-t45"> / {formatKLR(data.targetKcal)} kcal</span>
              </span>
            </div>
            <ProgressBar pct={pct} className="mt-[10px]" />
            <div className="text-t55" style={{ fontSize: 11.5, fontWeight: 500, marginTop: 8 }}>
              {margin >= 0 ? `${formatKLR(margin)} kcal marjın var — akşamı abartma 😏` : `${formatKLR(-margin)} kcal aştın — dikkat 😬`}
            </div>
          </div>

          {/* Meal cards 2x2 */}
          <div className="grid grid-cols-2 gap-[10px]">
            {meals.map((m) => (
              <MealCard key={m.key} meal={m} onEdit={() => setEditing(m.key)} />
            ))}
          </div>

          {/* Reward countdown card */}
          <button
            type="button"
            onClick={() => setShowReward(true)}
            className="flex items-center gap-3 bg-gold-bg border border-gold-border rounded-[16px] text-left"
            style={{ padding: '12px 16px' }}
          >
            <Coin size={26} glow={false} />
            <div className="flex-1">
              <div className="text-gold" style={{ fontSize: 12.5, fontWeight: 700 }}>
                Gün sonu ödülü hazırlanıyor
              </div>
              <div className="text-t55" style={{ fontSize: 11, fontWeight: 500 }}>
                Tahmini: {formatKLR(data.rewardEstimate)} KLR + streak bonusu
              </div>
            </div>
            <Countdown to={data.dayCloseMs} className="text-gold" />
          </button>
        </>
      )}

      {editing && (
        <MealSheet
          open={editing != null}
          mealKey={editing}
          initialKcal={meals.find((m) => m.key === editing)?.kcal ?? 0}
          onClose={() => setEditing(null)}
          onSaved={(kcal) =>
            setMeals((prev) => prev.map((m) => (m.key === editing ? { ...m, kcal, photo: m.photo } : m)))
          }
        />
      )}

      <RewardModal open={showReward} onCollect={() => setShowReward(false)} base={data.rewardEstimate} />
    </div>
  );
}

function MealCard({ meal, onEdit }: { meal: MealView; onEdit: () => void }) {
  if (meal.kcal <= 0) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="border-[1.5px] border-dashed border-dash rounded-[16px] flex flex-col justify-center items-center gap-1"
        style={{ padding: '12px 14px', minHeight: 88 }}
      >
        <span className="text-t80" style={{ fontSize: 12.5, fontWeight: 700 }}>
          {meal.label}
        </span>
        <span className="font-display text-accent" style={{ fontSize: 20, fontWeight: 700 }}>
          +
        </span>
        <span className="text-t45" style={{ fontSize: 10.5, fontWeight: 500 }}>
          kalori gir
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      className="bg-surface border border-acc-border rounded-[16px] shadow-card text-left"
      style={{ padding: '12px 14px' }}
    >
      <div className="flex justify-between">
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{meal.label}</span>
        <span className="text-accent" style={{ fontSize: 10, fontWeight: 600 }}>
          ✓
        </span>
      </div>
      <div className="font-display tnum" style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>
        {formatKLR(meal.kcal)} <span className="text-t45" style={{ fontFamily: 'var(--font-manrope)', fontSize: 11, fontWeight: 600 }}>kcal</span>
      </div>
      {meal.photo ? (
        <div className="flex items-center gap-[6px]" style={{ marginTop: 8 }}>
          <div className="bg-ph rounded-[8px]" style={{ width: 28, height: 28 }} />
          <span className="text-t45" style={{ fontSize: 10.5, fontWeight: 500 }}>
            foto eklendi
          </span>
        </div>
      ) : (
        <div className="text-t35" style={{ fontSize: 10.5, fontWeight: 500, marginTop: 10 }}>
          foto yok
        </div>
      )}
    </button>
  );
}

/** 4i — Streak Kalkanı devrede full screen. */
function ShieldActivated({ streakDays, multiplier }: { streakDays: number; multiplier: number }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center" style={{ padding: '120px 24px 0' }}>
      <div
        className="rounded-full bg-acc-soft border-2 border-accent flex items-center justify-center animate-klr-pop"
        style={{ width: 96, height: 96, fontSize: 44, boxShadow: '0 0 40px var(--acc-soft)' }}
      >
        🛡
      </div>
      <div className="font-display text-accent" style={{ fontSize: 22, fontWeight: 700, marginTop: 20 }}>
        Streak Kalkanı devrede!
      </div>
      <div className="text-t80" style={{ fontSize: 13.5, lineHeight: 1.55, fontWeight: 500, marginTop: 10, maxWidth: 270 }}>
        Dün hedefi 180 kcal aştın ama kalkan darbeyi yedi. Alevin yanmaya devam ediyor.
      </div>
      <div className="w-full bg-surface border border-border rounded-[18px] shadow-card flex flex-col gap-[10px]" style={{ padding: 16, marginTop: 24, fontSize: 13, fontWeight: 600 }}>
        <div className="flex justify-between">
          <span className="text-t55">Streak</span>
          <span>🔥 {streakDays} gün <span className="text-good">korundu</span></span>
        </div>
        <div className="flex justify-between">
          <span className="text-t55">Çarpan</span>
          <span className="font-display tnum">x{multiplier.toFixed(2).replace('.', ',')} <span className="text-good">korundu</span></span>
        </div>
        <div className="flex justify-between">
          <span className="text-t55">Kalkan</span>
          <span className="text-bad">kullanıldı · 0 kaldı</span>
        </div>
      </div>
      <div className="text-t45" style={{ fontSize: 12, fontWeight: 500, marginTop: 14 }}>
        Yenisi dükkânda seni bekliyor — 400 KLR.
      </div>
      <div className="w-full flex flex-col gap-[10px]" style={{ marginTop: 'auto', padding: '24px 0 40px' }}>
        <Link href="/shop" className="bg-accent text-btntext rounded-[16px] flex items-center justify-center" style={{ height: 54, fontSize: 15, fontWeight: 700 }}>
          Yeni kalkan al · 400 KLR
        </Link>
        <Link href="/" className="border-[1.5px] border-border text-t55 rounded-[16px] flex items-center justify-center" style={{ height: 54, fontSize: 15, fontWeight: 700 }}>
          Riskle yaşarım 😎
        </Link>
      </div>
    </div>
  );
}
