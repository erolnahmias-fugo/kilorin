'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coin } from '@/components/Coin';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { postApi } from '@/components/api';
import { formatKLR, formatKg } from '@/lib/money';
import { ACTIVITY_LEVELS, type ActivityId } from '@/lib/domain/constants';

type Step = 'invite' | 'profile' | 'result' | 'warning' | 'pending';

interface OnboardingResp {
  dailyTarget: number;
  clamped?: boolean;
  maintenance?: number;
  activityKcal?: number;
  deficitKcal?: number;
  suggestion?: { targetKg?: number; dailyTarget?: number };
}

const Dots = ({ active, count = 4 }: { active: number; count?: number }) => (
  <div className="flex justify-center gap-[6px]">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`rounded-[3px] ${i === active ? 'bg-accent' : 'bg-track'}`} style={{ width: i === active ? 18 : 6, height: 6 }} />
    ))}
  </div>
);

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('invite');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [heightCm, setHeightCm] = useState(178);
  const [age, setAge] = useState(29);
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [currentKg, setCurrentKg] = useState(86.4);
  const [targetKg, setTargetKg] = useState(78);
  const [activityId, setActivityId] = useState<ActivityId>('light');
  const [resp, setResp] = useState<OnboardingResp | null>(null);

  async function submitProfile(overrideTarget?: number) {
    setBusy(true);
    setError(null);
    const res = await postApi<OnboardingResp>('/api/onboarding', {
      inviteCode: code.trim(),
      heightCm,
      age,
      sex,
      currentKg,
      targetKg: overrideTarget ?? targetKg,
      activityId,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResp(res.data);
    if (res.data.clamped) setStep('warning');
    else setStep('result');
  }

  return (
    <div className="app-shell bg-bg text-text">
      {step === 'invite' && (
        <>
          <div className="flex-1 flex flex-col items-center text-center" style={{ padding: '110px 26px 0' }}>
            <Coin size={64} flip />
            <div className="font-display" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', marginTop: 16 }}>
              Kilorin
            </div>
            <div className="text-t55" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 6, maxWidth: 250 }}>
              Arkadaşlarınla kilo ver, KLR bas, hepsini kumarda kaybet.
            </div>
            <div className="text-t45" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', marginTop: 44 }}>
              DAVET KODU
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="K4F7··"
              maxLength={6}
              className="bg-surface border-[1.5px] border-acc-border rounded-[12px] shadow-card text-center font-display outline-none"
              style={{ marginTop: 12, width: 220, height: 56, fontSize: 22, fontWeight: 700, letterSpacing: '.3em' }}
            />
            <div className="text-t45" style={{ fontSize: 12, fontWeight: 500, marginTop: 14 }}>
              Kodu grubun admin&apos;inden al.
            </div>
            {error && <div className="text-bad" style={{ fontSize: 12, marginTop: 10 }}>{error}</div>}
          </div>
          <div className="flex flex-col gap-[14px]" style={{ padding: '0 22px 20px' }}>
            <button
              type="button"
              onClick={() => (code.trim() ? setStep('profile') : setError('Davet kodunu gir.'))}
              className="bg-accent text-btntext rounded-[16px] flex items-center justify-center"
              style={{ height: 54, fontSize: 15, fontWeight: 700 }}
            >
              Gruba Katıl
            </button>
            <div className="text-center text-accent" style={{ fontSize: 12.5, fontWeight: 600 }}>
              Kurucuysan yeni grup aç →
            </div>
            <Dots active={0} />
            <MedicalDisclaimer className="mt-1" />
          </div>
        </>
      )}

      {step === 'profile' && (
        <>
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto" style={{ padding: '76px 22px 0' }}>
            <div>
              <div className="font-display" style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.01em' }}>
                Seni tanıyalım
              </div>
              <div className="text-t55" style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>
                Günlük kalori hedefini bunlarla hesaplıyoruz.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[10px]" style={{ marginTop: 8 }}>
              <NumField label="BOY" unit="cm" value={heightCm} onChange={setHeightCm} step={1} />
              <NumField label="YAŞ" value={age} onChange={setAge} step={1} />
            </div>
            <div className="bg-surface border border-border rounded-[16px] shadow-card" style={{ padding: '13px 15px' }}>
              <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em' }}>CİNSİYET</div>
              <div className="flex gap-2" style={{ marginTop: 9 }}>
                {(['male', 'female'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSex(s)}
                    className={`flex-1 rounded-[11px] flex items-center justify-center ${sex === s ? 'bg-acc-soft border-[1.5px] border-accent text-accent' : 'border-[1.5px] border-border text-t55'}`}
                    style={{ height: 40, fontSize: 13, fontWeight: sex === s ? 700 : 600 }}
                  >
                    {s === 'male' ? 'Erkek' : 'Kadın'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <NumField label="MEVCUT KİLO" unit="kg" value={currentKg} onChange={setCurrentKg} step={0.1} decimal />
              <NumField label="HEDEF KİLO" unit="kg" value={targetKg} onChange={setTargetKg} step={0.1} decimal accent />
            </div>
            <div className="bg-surface border border-border rounded-[16px] shadow-card" style={{ padding: '13px 15px' }}>
              <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em' }}>AKTİVİTE DÜZEYİ</div>
              <div className="flex flex-col gap-[6px]" style={{ marginTop: 9 }}>
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActivityId(a.id)}
                    className={`w-full text-left rounded-[11px] ${activityId === a.id ? 'bg-acc-soft border-[1.5px] border-accent text-accent' : 'border-[1.5px] border-border text-t55'}`}
                    style={{ padding: '9px 12px', fontSize: 12.5, fontWeight: activityId === a.id ? 700 : 600 }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-t45" style={{ fontSize: 11.5, fontWeight: 500, padding: '0 4px' }}>
              <span>🔒</span>
              <span>Verilerin sadece grubuna görünür — internete değil.</span>
            </div>
            {error && <div className="text-bad" style={{ fontSize: 12 }}>{error}</div>}
          </div>
          <div className="flex flex-col gap-[14px]" style={{ padding: '0 22px 20px' }}>
            <button
              type="button"
              onClick={() => submitProfile()}
              disabled={busy}
              className="bg-accent text-btntext rounded-[16px] flex items-center justify-center disabled:opacity-60"
              style={{ height: 54, fontSize: 15, fontWeight: 700 }}
            >
              {busy ? 'Hesaplanıyor…' : 'Devam'}
            </button>
            <Dots active={1} />
          </div>
        </>
      )}

      {step === 'result' && resp && (
        <>
          <div className="flex-1 flex flex-col items-center text-center relative" style={{ padding: '110px 26px 0' }}>
            <div className="absolute pointer-events-none bg-glow" style={{ top: 60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 220 }} />
            <div className="text-t45" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em' }}>GÜNLÜK HEDEFİN</div>
            <div className="flex items-baseline gap-2 animate-klr-pop" style={{ marginTop: 10 }}>
              <span className="font-display tnum num-glow" style={{ fontSize: 64, lineHeight: 1, fontWeight: 700, letterSpacing: '-.03em' }}>
                {formatKLR(resp.dailyTarget)}
              </span>
              <span className="font-display text-accent" style={{ fontSize: 20, fontWeight: 700 }}>kcal</span>
            </div>
            <div className="text-t55" style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>
              Haftada ~0,6 kg kayıp · sezon sonu tahmini <b>{formatKg(targetKg)} kg</b>
            </div>
            <div className="w-full bg-surface border border-border rounded-[18px] shadow-card overflow-hidden" style={{ marginTop: 28 }}>
              <BreakRow label="Bazal metabolizma" value={`${formatKLR(resp.maintenance ?? 1780)} kcal`} />
              <BreakRow label="Aktivite" value={`+${formatKLR(resp.activityKcal ?? 420)} kcal`} color="good" />
              <BreakRow label="Hedef açığı" value={`−${formatKLR(resp.deficitKcal ?? 350)} kcal`} color="bad" last />
            </div>
            <div className="text-t45" style={{ fontSize: 11.5, fontWeight: 500, marginTop: 14 }}>
              Hedefin altında kapattığın her gün KLR kazanırsın. 💰
            </div>
          </div>
          <div className="flex flex-col gap-[14px]" style={{ padding: '0 22px 20px' }}>
            <button
              type="button"
              onClick={() => setStep('pending')}
              className="bg-accent text-btntext rounded-[16px] flex items-center justify-center"
              style={{ height: 54, fontSize: 15, fontWeight: 700 }}
            >
              Onayla ve başla
            </button>
            <Dots active={2} />
            <MedicalDisclaimer className="mt-1" />
          </div>
        </>
      )}

      {step === 'warning' && resp && (
        <>
          <div className="flex-1 flex flex-col items-center text-center" style={{ padding: '100px 26px 0' }}>
            <div className="w-full bg-bad-soft border-[1.5px] border-bad rounded-[20px]" style={{ padding: '20px 18px' }}>
              <div style={{ fontSize: 32 }}>⚠️</div>
              <div className="font-display text-bad" style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>Bu hedef fazla agresif</div>
              <div className="text-t80" style={{ fontSize: 13, lineHeight: 1.55, fontWeight: 500, marginTop: 8 }}>
                {formatKg(targetKg)} kg hedefi haftada fazla kayıp demek — sağlıklı sınır 1,0 kg. Kilorin sağlıksız zayıflamaya ödül vermez.
              </div>
            </div>
            <div className="w-full bg-surface border border-border rounded-[18px] shadow-card" style={{ padding: 16, marginTop: 14 }}>
              <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em' }}>ÖNERİLEN DÜZELTME</div>
              <div className="flex items-center justify-center gap-[14px]" style={{ marginTop: 10 }}>
                <div>
                  <div className="font-display tnum text-t35" style={{ fontSize: 20, fontWeight: 700, textDecoration: 'line-through' }}>{formatKg(targetKg)} kg</div>
                  <div className="text-t35" style={{ fontSize: 10.5, fontWeight: 600 }}>senin hedefin</div>
                </div>
                <div className="font-display text-accent" style={{ fontSize: 18, fontWeight: 700 }}>→</div>
                <div>
                  <div className="font-display tnum text-accent" style={{ fontSize: 24, fontWeight: 700 }}>{formatKg(resp.suggestion?.targetKg ?? targetKg + 2)} kg</div>
                  <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 600 }}>bu sezon için</div>
                </div>
              </div>
              <div className="text-t55" style={{ fontSize: 12, fontWeight: 500, marginTop: 10 }}>
                Günlük hedef: <b>{formatKLR(resp.suggestion?.dailyTarget ?? resp.dailyTarget)} kcal</b> · Sezon bitince tekrar düşersin.
              </div>
            </div>
            <div className="text-t45" style={{ fontSize: 11.5, fontWeight: 500, marginTop: 14 }}>Uzun oyun, kısa açlıktan iyidir. 🐢</div>
          </div>
          <div className="flex flex-col gap-[10px]" style={{ padding: '0 22px 20px' }}>
            <button
              type="button"
              onClick={() => {
                const s = resp.suggestion?.targetKg;
                if (s) setTargetKg(s);
                setStep('result');
              }}
              className="bg-accent text-btntext rounded-[16px] flex items-center justify-center"
              style={{ height: 54, fontSize: 15, fontWeight: 700 }}
            >
              Önerilen hedefle devam
            </button>
            <button
              type="button"
              onClick={() => setStep('profile')}
              className="border-[1.5px] border-border text-t55 rounded-[16px] flex items-center justify-center"
              style={{ height: 54, fontSize: 15, fontWeight: 700 }}
            >
              Hedefi düzenle
            </button>
            <MedicalDisclaimer className="mt-1" />
          </div>
        </>
      )}

      {step === 'pending' && (
        <>
          <div className="flex-1 flex flex-col items-center text-center" style={{ padding: '120px 26px 0' }}>
            <div className="rounded-full bg-acc-soft flex items-center justify-center animate-klr-pulse" style={{ width: 72, height: 72, fontSize: 32 }}>⏳</div>
            <div className="font-display" style={{ fontSize: 22, fontWeight: 700, marginTop: 18 }}>Admin onayı bekleniyor</div>
            <div className="text-t55" style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 500, marginTop: 8, maxWidth: 260 }}>
              Başvurun admine gitti. Onaylanınca sezon cüzdanın açılır.
            </div>
            <div className="w-full bg-surface border border-border rounded-[18px] shadow-card" style={{ padding: 16, marginTop: 26 }}>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-acc-soft border-[1.5px] border-acc-border flex items-center justify-center font-display text-accent" style={{ width: 44, height: 44, fontSize: 17, fontWeight: 700 }}>K</div>
                <div className="text-left flex-1">
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Sen · {age}</div>
                  <div className="text-t55" style={{ fontSize: 11.5, fontWeight: 500 }}>{formatKg(currentKg)} → {formatKg(targetKg)} kg · {formatKLR(resp?.dailyTarget ?? 1850)} kcal/gün</div>
                </div>
                <div className="bg-gold-bg border border-gold-border text-gold rounded-full whitespace-nowrap" style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px' }}>BEKLİYOR</div>
              </div>
            </div>
            <div className="text-t45" style={{ fontSize: 12, fontWeight: 500, marginTop: 14 }}>Ortalama onay süresi: 2 saat</div>
          </div>
          <div style={{ padding: '0 22px 40px' }}>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full border-[1.5px] border-acc-border text-accent rounded-[16px] flex items-center justify-center"
              style={{ height: 54, fontSize: 15, fontWeight: 700 }}
            >
              Ana ekrana git
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NumField({
  label,
  unit,
  value,
  onChange,
  step,
  decimal = false,
  accent = false,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  decimal?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`bg-surface rounded-[16px] shadow-card ${accent ? 'border-[1.5px] border-accent' : 'border border-border'}`} style={{ padding: '13px 15px' }}>
      <div className={accent ? 'text-accent' : 'text-t45'} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em' }}>{label}</div>
      <div className="flex items-baseline gap-1" style={{ marginTop: 5 }}>
        <input
          type="number"
          inputMode="decimal"
          value={decimal ? value : Math.round(value)}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`font-display tnum bg-transparent outline-none w-full ${accent ? 'text-accent' : ''}`}
          style={{ fontSize: 22, fontWeight: 700 }}
        />
        {unit && <span className="text-t45" style={{ fontSize: 12, fontWeight: 600 }}>{unit}</span>}
      </div>
    </div>
  );
}

function BreakRow({ label, value, color, last = false }: { label: string; value: string; color?: 'good' | 'bad'; last?: boolean }) {
  return (
    <div className={`flex justify-between ${last ? '' : 'border-b border-border'}`} style={{ padding: '12px 16px', fontSize: 12.5, fontWeight: 600 }}>
      <span className="text-t55">{label}</span>
      <span className={`font-display tnum ${color === 'good' ? 'text-good' : color === 'bad' ? 'text-bad' : ''}`} style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}
