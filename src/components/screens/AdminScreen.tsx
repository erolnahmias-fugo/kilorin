'use client';
import { useState } from 'react';
import { ProgressBar } from '../ProgressBar';
import { postApi } from '../api';

export interface PendingMember {
  id: string;
  name: string;
  initial: string;
  detail: string;
}
export interface WeighDispute {
  id: string;
  name: string;
  detail: string;
}

const DAY_CODES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];

export function AdminScreen({
  pending,
  disputes,
  lengthWeeks: initLen,
  weighDays: initDays,
}: {
  pending: PendingMember[];
  disputes: WeighDispute[];
  lengthWeeks: number;
  weighDays: string[];
}) {
  const [members, setMembers] = useState(pending);
  const [reviews, setReviews] = useState(disputes);
  const [lengthWeeks, setLengthWeeks] = useState(initLen);
  const [days, setDays] = useState<string[]>(initDays);
  const [saved, setSaved] = useState(false);

  async function approve(id: string, ok: boolean) {
    await postApi('/api/admin/approve', { memberId: id, approve: ok });
    setMembers((m) => m.filter((x) => x.id !== id));
  }
  async function review(id: string, reject: boolean) {
    await postApi('/api/admin/weigh-review', { weighInId: id, reject });
    setReviews((r) => r.filter((x) => x.id !== id));
  }
  async function saveSeason() {
    await postApi('/api/admin/season', { lengthWeeks, weighDays: days });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="flex-1 flex flex-col gap-[11px]" style={{ padding: '70px 18px 0' }}>
      <div className="flex items-center gap-2">
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Admin</div>
        <span className="bg-gold-bg border border-gold-border text-gold rounded-full" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', padding: '4px 10px' }}>KASA SENSİN</span>
      </div>

      <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', marginTop: 2 }}>ÜYE ONAYLARI · {members.length}</div>
      {members.length === 0 && <div className="text-t35" style={{ fontSize: 12 }}>Bekleyen başvuru yok.</div>}
      {members.map((m) => (
        <div key={m.id} className="bg-surface border border-border rounded-[16px] shadow-card" style={{ padding: '13px 14px' }}>
          <div className="flex items-center gap-[11px]">
            <div className="rounded-full bg-acc-soft flex items-center justify-center font-display text-accent flex-none" style={{ width: 40, height: 40, fontSize: 15, fontWeight: 700 }}>{m.initial}</div>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
              <div className="text-t55" style={{ fontSize: 11, fontWeight: 500 }}>{m.detail}</div>
            </div>
          </div>
          <div className="flex gap-2" style={{ marginTop: 12 }}>
            <button type="button" onClick={() => approve(m.id, true)} className="flex-1 bg-accent text-btntext rounded-[11px] flex items-center justify-center" style={{ height: 40, fontSize: 12.5, fontWeight: 700 }}>Onayla</button>
            <button type="button" onClick={() => approve(m.id, false)} className="flex-1 border-[1.5px] border-border text-t55 rounded-[11px] flex items-center justify-center" style={{ height: 40, fontSize: 12.5, fontWeight: 700 }}>Reddet</button>
          </div>
        </div>
      ))}

      <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', marginTop: 2 }}>TARTI İTİRAZLARI · {reviews.length}</div>
      {reviews.map((d) => (
        <div key={d.id} className="bg-surface border border-border rounded-[16px] shadow-card flex items-center gap-3" style={{ padding: '13px 14px' }}>
          <div className="bg-ph rounded-[12px] flex-none" style={{ width: 48, height: 48 }} />
          <div className="flex-1">
            <div style={{ fontSize: 13, fontWeight: 700 }}>{d.name}</div>
            <div className="text-t55" style={{ fontSize: 11, fontWeight: 500 }}>{d.detail}</div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <button type="button" onClick={() => review(d.id, false)} className="bg-acc-soft text-accent rounded-full" style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 12px' }}>Kabul</button>
            <button type="button" onClick={() => review(d.id, true)} className="bg-bad-soft text-bad rounded-full" style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 12px' }}>Reddet</button>
          </div>
        </div>
      ))}

      <div className="text-t45" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em', marginTop: 2 }}>SEZON AYARLARI</div>
      <div className="bg-surface border border-border rounded-[16px] shadow-card flex flex-col gap-[14px]" style={{ padding: 14 }}>
        <div>
          <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 600 }}>
            <span className="text-t55">Sezon uzunluğu</span>
            <span className="font-display text-accent" style={{ fontSize: 12.5, fontWeight: 700 }}>{lengthWeeks} hafta</span>
          </div>
          <input type="range" min={8} max={24} value={lengthWeeks} onChange={(e) => setLengthWeeks(Number(e.target.value))} className="w-full" style={{ marginTop: 9, accentColor: 'var(--accent)' }} />
          <ProgressBar pct={((lengthWeeks - 8) / 16) * 100} height={8} className="mt-1" />
          <div className="flex justify-between text-t35" style={{ fontSize: 9.5, fontWeight: 600, marginTop: 5 }}>
            <span>8</span>
            <span>24 hafta</span>
          </div>
        </div>
        <div>
          <div className="text-t55" style={{ fontSize: 12, fontWeight: 600 }}>Tartı günleri (haftada 2)</div>
          <div className="flex gap-[6px]" style={{ marginTop: 9 }}>
            {DAY_CODES.map((c) => {
              const on = days.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDays((d) => (on ? d.filter((x) => x !== c) : [...d, c]))}
                  className={`rounded-full ${on ? 'bg-acc-soft border-[1.5px] border-accent text-accent' : 'border-[1.5px] border-border text-t45'}`}
                  style={{ fontSize: 11, fontWeight: 700, padding: '6px 11px' }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" onClick={saveSeason} className="bg-accent text-btntext rounded-[13px] flex items-center justify-center" style={{ height: 46, fontSize: 13.5, fontWeight: 700 }}>
          {saved ? 'Kaydedildi ✓' : 'Ayarları kaydet'}
        </button>
      </div>
    </div>
  );
}
