'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '../ThemeToggle';
import { MedicalDisclaimer } from '../MedicalDisclaimer';
import { formatKg, formatKLR } from '@/lib/money';
import { createClient } from '@/lib/supabase/client';

export interface WeightPoint {
  label: string;
  kg: number;
}

export interface ProfileData {
  name: string;
  subtitle: string;
  netWorth: number;
  startKg: number;
  currentKg: number;
  targetKg: number;
  avatarUrl: string | null;
  weights: WeightPoint[];
  isAdmin: boolean;
}

export function ProfileScreen({ data }: { data: ProfileData }) {
  const router = useRouter();

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      /* ignore */
    }
    router.push('/login');
  }

  const remaining = Math.max(0, data.currentKg - data.targetKg);
  const kgs = data.weights.map((w) => w.kg);
  const max = Math.max(...kgs, data.currentKg);
  const min = Math.min(...kgs, data.targetKg);
  const range = Math.max(0.1, max - min);

  return (
    <div className="flex-1 flex flex-col gap-3" style={{ padding: '70px 18px 0' }}>
      {/* header */}
      <div className="flex items-center gap-[14px]">
        <div className="rounded-[20px] bg-ph border-2 border-accent relative flex-none bg-cover bg-center" style={{ width: 64, height: 64, backgroundImage: data.avatarUrl ? `url(${data.avatarUrl})` : undefined }}>
          <span className="absolute" style={{ bottom: -6, right: -6, fontSize: 18 }}>🧢</span>
        </div>
        <div className="flex-1">
          <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>{data.name}</div>
          <div className="text-t55" style={{ fontSize: 11.5, fontWeight: 500 }}>{data.subtitle}</div>
          <div className="flex gap-[5px]" style={{ marginTop: 6, fontSize: 13 }}>
            <span title="İlk tartı">🥇</span>
            <span title="7 gün streak">🔥</span>
            <span title="İlk yatırım">📈</span>
            <span title="Kumar borcu ödendi">🎰</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display tnum" style={{ fontSize: 16, fontWeight: 700 }}>{formatKLR(data.netWorth)}</div>
          <div className="text-gold" style={{ fontSize: 10, fontWeight: 600 }}>NET SERVET</div>
        </div>
      </div>

      {/* prestige showcase */}
      <div className="flex gap-2">
        <div className="flex-1 bg-gold-bg border border-gold-border rounded-[14px] text-center" style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 20 }}>⌚</div>
          <div className="text-gold" style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3 }}>Kolex</div>
        </div>
        <div className="flex-1 bg-gold-bg border border-gold-border rounded-[14px] text-center" style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 20 }}>🏠</div>
          <div className="text-gold" style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3 }}>Stüdyo</div>
        </div>
        <div className="flex-1 border-[1.5px] border-dashed border-dash rounded-[14px] text-center" style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 20, opacity: 0.35 }}>🏎</div>
          <div className="text-t35" style={{ fontSize: 10.5, fontWeight: 600, marginTop: 3 }}>boş vitrin</div>
        </div>
      </div>

      {/* weight progress chart */}
      <div className="bg-surface border border-border rounded-[18px] shadow-card" style={{ padding: '14px 16px' }}>
        <div className="flex justify-between items-baseline">
          <span className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em' }}>KİLO İLERLEMESİ</span>
          <span className="font-display tnum text-good" style={{ fontSize: 12.5, fontWeight: 700 }}>{formatKg(data.startKg)} → {formatKg(data.currentKg)} kg</span>
        </div>
        <div className="flex items-end gap-[7px]" style={{ height: 74, marginTop: 12 }}>
          {data.weights.map((w, i) => {
            const h = 42 + ((w.kg - min) / range) * 22;
            const last = i >= data.weights.length - 2;
            return (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={last ? 'bg-grad' : 'bg-track'}
                  style={{ width: '100%', height: h, borderRadius: '6px 6px 0 0', opacity: last ? (i === data.weights.length - 1 ? 1 : 0.75) : 1 }}
                />
                <span className={i === data.weights.length - 1 ? 'text-accent' : 'text-t35'} style={{ fontSize: 9, fontWeight: 600 }}>{w.label}</span>
              </div>
            );
          })}
        </div>
        <div className="text-t55" style={{ fontSize: 11, fontWeight: 500, marginTop: 8 }}>
          Hedefe kalan: <b>{formatKg(remaining)} kg</b> · tempo: haftada 0,6 kg
        </div>
      </div>

      {/* photo timeline */}
      <div className="bg-surface border border-border rounded-[18px] shadow-card" style={{ padding: '14px 16px' }}>
        <div className="flex justify-between items-baseline">
          <span className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em' }}>FOTO ZAMAN TÜNELİ</span>
          <span className="text-t35" style={{ fontSize: 10, fontWeight: 600 }}>🔒 sadece gruba görünür</span>
        </div>
        <div className="flex gap-2" style={{ marginTop: 11 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 bg-ph rounded-[10px]" style={{ aspectRatio: '3 / 4' }} />
          ))}
          <div className="flex-1 border-[1.5px] border-dashed border-dash rounded-[10px] flex items-center justify-center font-display text-accent" style={{ aspectRatio: '3 / 4', fontSize: 16, fontWeight: 700 }}>+</div>
        </div>
      </div>

      {/* settings */}
      <div className="bg-surface border border-border rounded-[18px] shadow-card flex flex-col gap-3" style={{ padding: 14 }}>
        <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em' }}>TEMA</div>
        <ThemeToggle />
        <div className="flex gap-2">
          <Link href="/shop" className="flex-1 border border-border rounded-[12px] text-center text-t80" style={{ padding: '10px 0', fontSize: 13, fontWeight: 700 }}>🛒 Dükkân</Link>
          {data.isAdmin && (
            <Link href="/admin" className="flex-1 border border-border rounded-[12px] text-center text-t80" style={{ padding: '10px 0', fontSize: 13, fontWeight: 700 }}>🛠 Admin</Link>
          )}
        </div>
        <button type="button" onClick={signOut} className="w-full border border-border rounded-[12px] text-t55" style={{ padding: '10px 0', fontSize: 13, fontWeight: 700 }}>
          Çıkış yap
        </button>
      </div>

      <MedicalDisclaimer className="mb-2" />
    </div>
  );
}
