/** 🤨 "−%10" penalty banner shown while the member is flagged suspicious. */
export function SuspicionBanner({ daysLeft }: { daysLeft?: number }) {
  return (
    <div className="flex items-center gap-[10px] bg-bad-soft border border-bad rounded-[14px]" style={{ padding: '10px 14px' }}>
      <span style={{ fontSize: 16 }}>🤨</span>
      <span className="flex-1 text-t80" style={{ fontSize: 11.5, fontWeight: 600 }}>
        Şüpheli rozeti aktif: tüm kazançlarda <b className="text-bad">−%10</b>
      </span>
      {daysLeft != null && (
        <span className="font-display tnum text-bad" style={{ fontSize: 11, fontWeight: 700 }}>
          {daysLeft} gün
        </span>
      )}
    </div>
  );
}
