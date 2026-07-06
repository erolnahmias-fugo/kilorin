'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Countdown } from '../Countdown';
import { PhotoUpload } from '../PhotoUpload';
import { postApi } from '../api';

export function BombScreen({ attackerName, deadlineMs }: { attackerName: string; deadlineMs: number }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logDessert() {
    if (!photo) {
      setError('Önce tatlının fotoğrafını ekle.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await postApi('/api/log', { meals: { snack: 350 }, photos: { snack: photo }, dessert: true });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push('/');
  }

  return (
    <div className="flex-1 flex flex-col" style={{ padding: '104px 24px 0' }}>
      <div className="flex flex-col items-center text-center">
        <div className="animate-klr-pop" style={{ fontSize: 56 }}>💣🍰</div>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700, marginTop: 14 }}>{attackerName} sana Tatlı Bombası attı!</div>
        <div className="text-t80" style={{ fontSize: 13, lineHeight: 1.55, fontWeight: 500, marginTop: 8, maxWidth: 270 }}>
          24 saat içinde <b>fotoğraflı bir tatlı</b> loglamak zorundasın. Kalorisi güne sayılır. Kurallar acımasız.
        </div>
        <div className="bg-surface border-[1.5px] border-bad rounded-[20px]" style={{ padding: '16px 26px', marginTop: 22 }}>
          <div className="text-bad" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.14em' }}>KALAN SÜRE</div>
          <Countdown to={deadlineMs} withDays className="animate-klr-pulse" style={{ fontSize: 40, fontWeight: 700, marginTop: 4, display: 'block' }} />
          <div className="text-t45" style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>süre dolarsa: −200 KLR + rezillik</div>
        </div>
        <div className="w-full" style={{ marginTop: 16 }}>
          <PhotoUpload bucket="meal-photos" title="Tatlı fotoğrafı" hint="Isırık alınmış olması tercih sebebi." onUploaded={setPhoto} />
        </div>
        {error && <div className="text-bad" style={{ fontSize: 12, marginTop: 12 }}>{error}</div>}
      </div>
      <div className="flex flex-col gap-[10px]" style={{ marginTop: 'auto', padding: '24px 0 40px' }}>
        <button
          type="button"
          onClick={logDessert}
          disabled={busy}
          className="bg-accent text-btntext rounded-[16px] flex items-center justify-center disabled:opacity-60"
          style={{ height: 54, fontSize: 15, fontWeight: 700 }}
        >
          {busy ? 'Loglanıyor…' : 'Tatlıyı logla 🍰'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="border-[1.5px] border-border text-t45 rounded-[16px] flex items-center justify-center"
          style={{ height: 52, fontSize: 14, fontWeight: 700 }}
        >
          İtiraz et (işe yaramaz)
        </button>
      </div>
    </div>
  );
}
