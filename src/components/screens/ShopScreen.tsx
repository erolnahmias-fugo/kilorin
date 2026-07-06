'use client';
import { useState } from 'react';
import { Coin } from '../Coin';
import { BottomSheet } from '../BottomSheet';
import { PhotoUpload } from '../PhotoUpload';
import { postApi } from '../api';
import { formatKLR } from '@/lib/money';
import type { ShopItemView } from '../demo';

export interface MemberOption {
  id: string;
  name: string;
  initial: string;
}

export function ShopScreen({
  items,
  balance,
  members,
}: {
  items: ShopItemView[];
  balance: number;
  members: MemberOption[];
}) {
  const [picker, setPicker] = useState<ShopItemView | null>(null);
  const [avatar, setAvatar] = useState<ShopItemView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function purchase(item: ShopItemView, meta?: Record<string, unknown>) {
    setBusyKey(item.key);
    const res = await postApi<{ purchaseId: string }>('/api/shop/purchase', { itemKey: item.key, meta });
    setBusyKey(null);
    setToast(res.ok ? `${item.name} alındı ✓` : res.error);
    setTimeout(() => setToast(null), 2200);
  }

  function onBuy(item: ShopItemView) {
    if (item.key === 'dessertBomb') setPicker(item);
    else if (item.key === 'aiAvatar') setAvatar(item);
    else purchase(item);
  }

  return (
    <div className="flex-1 flex flex-col gap-[11px]" style={{ padding: '70px 18px 0' }}>
      <div className="flex justify-between items-center">
        <div className="font-display" style={{ fontSize: 22, fontWeight: 700 }}>Dükkân</div>
        <div className="flex items-center gap-[6px] bg-surface border border-border rounded-full" style={{ padding: '6px 12px' }}>
          <Coin size={18} glow={false} />
          <span className="font-display tnum" style={{ fontSize: 13, fontWeight: 700 }}>{formatKLR(balance)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[10px]">
        {items.map((it) => (
          <div
            key={it.id}
            className={`bg-surface rounded-[16px] shadow-card ${it.highlight ? 'border-[1.5px] border-acc-border' : 'border border-border'}`}
            style={{ padding: 13 }}
          >
            <div style={{ fontSize: 26 }}>{it.emoji}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8 }}>{it.name}</div>
            <div className="text-t55" style={{ fontSize: 10.5, fontWeight: 500 }}>{it.description}</div>
            <div className="flex justify-between items-center" style={{ marginTop: 10 }}>
              <span className="font-display text-gold tnum" style={{ fontSize: 13, fontWeight: 700 }}>{formatKLR(it.price)} KLR</span>
              <button
                type="button"
                onClick={() => onBuy(it)}
                disabled={busyKey === it.key}
                className={`rounded-full disabled:opacity-60 ${it.primary ? 'bg-accent text-btntext' : 'bg-acc-soft text-accent'}`}
                style={{ fontSize: 10.5, fontWeight: 700, padding: '5px 11px' }}
              >
                {busyKey === it.key ? '…' : it.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-t35" style={{ fontSize: 11, fontWeight: 500 }}>
        Kozmetikler kilo verdirmez ama havan yerinde olur. ✨
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bg-surface border border-acc-border text-text rounded-full shadow-card z-50" style={{ bottom: 90, padding: '10px 18px', fontSize: 12.5, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* Dessert bomb target picker */}
      {picker && (
        <BottomSheet open onClose={() => setPicker(null)}>
          <div className="font-display" style={{ fontSize: 17, fontWeight: 700 }}>Kime Tatlı Bombası? 💣🍰</div>
          <div className="text-t55" style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>
            Seçtiğin kişi 24 saatte fotolu tatlı loglamak zorunda.
          </div>
          <div className="flex flex-col gap-2" style={{ marginTop: 14 }}>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { purchase(picker, { targetMemberId: m.id }); setPicker(null); }}
                className="flex items-center gap-3 bg-bg border border-border rounded-[14px] text-left"
                style={{ padding: '10px 12px' }}
              >
                <div className="rounded-full bg-acc-soft flex items-center justify-center font-display text-accent flex-none" style={{ width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>{m.initial}</div>
                <span className="flex-1" style={{ fontSize: 13.5, fontWeight: 700 }}>{m.name}</span>
                <span className="text-accent" style={{ fontSize: 12, fontWeight: 700 }}>Seç →</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPicker(null)} className="w-full text-center text-t45" style={{ fontSize: 13, fontWeight: 600, marginTop: 14 }}>Vazgeç</button>
        </BottomSheet>
      )}

      {/* AI avatar photo upload */}
      {avatar && (
        <BottomSheet open onClose={() => setAvatar(null)}>
          <div className="flex items-center gap-3">
            <div className="rounded-[14px] bg-acc-soft flex items-center justify-center" style={{ width: 46, height: 46, fontSize: 22 }}>🤖</div>
            <div className="flex-1">
              <div className="font-display" style={{ fontSize: 17, fontWeight: 700 }}>AI Avatar · {formatKLR(avatar.price)} KLR</div>
              <div className="text-t55" style={{ fontSize: 12, fontWeight: 500 }}>Fotoğrafını yükle, efsaneye dönüş.</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <PhotoUpload
              bucket="avatars"
              title="Yüz fotoğrafı"
              hint="Net, önden bir kare işe yarar."
              onUploaded={(path) => { purchase(avatar, { photoPath: path }); setAvatar(null); }}
            />
          </div>
          <button type="button" onClick={() => setAvatar(null)} className="w-full text-center text-t45" style={{ fontSize: 13, fontWeight: 600, marginTop: 14 }}>Vazgeç</button>
        </BottomSheet>
      )}
    </div>
  );
}
