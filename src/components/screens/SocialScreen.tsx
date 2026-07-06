'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getApi } from '../api';
import { formatKLR } from '@/lib/money';
import { demoLeaderboard, type LeaderRow } from '../demo';

interface ApiRow {
  memberId: string;
  displayName: string;
  streak: number;
  suspicious?: boolean;
  netWorth: number;
}

export function SocialScreen({ myMemberId }: { myMemberId: string | null }) {
  const [rows, setRows] = useState<LeaderRow[]>(demoLeaderboard);

  useEffect(() => {
    (async () => {
      const res = await getApi<ApiRow[]>('/api/leaderboard');
      if (res.ok && res.data.length) {
        const sorted = [...res.data].sort((a, b) => b.netWorth - a.netWorth);
        setRows(
          sorted.map((r, i) => ({
            rank: i + 1,
            name: r.memberId === myMemberId ? `${r.displayName} (sen)` : r.displayName,
            initial: r.displayName.charAt(0).toUpperCase(),
            streak: r.streak,
            streakBroken: r.streak === 0,
            netWorth: r.netWorth,
            suspicious: r.suspicious,
            isMe: r.memberId === myMemberId,
            crown: i === 0,
          })),
        );
      }
    })();
  }, [myMemberId]);

  return (
    <div className="flex-1 flex flex-col gap-[11px]" style={{ padding: '70px 18px 0' }}>
      <div className="flex justify-between items-center">
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Liderlik</div>
        <Link href="/shop" className="flex items-center gap-1 bg-surface border border-border rounded-full text-t55" style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 600 }}>
          🛒 Dükkân
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        <div className="bg-gold-bg border border-gold-border rounded-[16px]" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 22 }}>🏆</div>
          <div className="text-gold" style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Kilorin Şampiyonu</div>
          <div className="text-t55" style={{ fontSize: 10.5, fontWeight: 500 }}>Sezon sonu en yüksek net servet</div>
        </div>
        <div className="bg-acc-soft border border-acc-border rounded-[16px]" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 22 }}>🦋</div>
          <div className="text-accent" style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Dönüşüm Şampiyonu</div>
          <div className="text-t55" style={{ fontSize: 10.5, fontWeight: 500 }}>En yüksek % kilo kaybı</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[18px] shadow-card overflow-hidden">
        {rows.map((r, i) => (
          <div
            key={r.rank}
            className={`flex items-center gap-[11px] ${i < rows.length - 1 ? 'border-b border-border' : ''} ${r.isMe ? 'bg-acc-soft' : ''}`}
            style={{ padding: '12px 14px' }}
          >
            <span className={`font-display ${r.crown ? 'text-gold' : r.isMe ? 'text-accent' : 'text-t45'}`} style={{ fontSize: 13, fontWeight: 700, width: 18 }}>{r.rank}</span>
            <div
              className={`rounded-full flex items-center justify-center font-display flex-none ${r.crown ? 'bg-gold-bg border-[1.5px] border-gold-border text-gold' : r.isMe ? 'bg-surface border-[1.5px] border-accent text-accent' : 'bg-track text-t55'}`}
              style={{ width: 36, height: 36, fontSize: 14, fontWeight: 700 }}
            >
              {r.initial}
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {r.name} {r.crown && '👑'} {r.suspicious && <span title="Şüpheli">🤨</span>}
              </div>
              <div className="text-t55" style={{ fontSize: 10.5, fontWeight: 500 }}>
                {r.streakBroken ? '🕯' : '🔥'} {r.streak} gün{r.note ? ` · ${r.note}` : ''}
              </div>
            </div>
            <div className="font-display tnum" style={{ fontSize: 14, fontWeight: 700 }}>{formatKLR(r.netWorth)}</div>
          </div>
        ))}
      </div>

      <div className="text-center text-t35" style={{ fontSize: 11, fontWeight: 500 }}>
        Sıralama net servete göre · tartılar admin onaylı.
      </div>
    </div>
  );
}
