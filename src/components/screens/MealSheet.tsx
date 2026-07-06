'use client';
import { useState } from 'react';
import { BottomSheet } from '../BottomSheet';
import { PhotoUpload } from '../PhotoUpload';
import { postApi } from '../api';
import { formatKLR } from '@/lib/money';
import type { MealKey } from '../demo';
import { MEAL_LABELS } from '../demo';

/** Bottom sheet to log/edit a single meal's calories + optional photo. */
export function MealSheet({
  open,
  mealKey,
  initialKcal,
  onClose,
  onSaved,
}: {
  open: boolean;
  mealKey: MealKey;
  initialKcal: number;
  onClose: () => void;
  onSaved: (kcal: number) => void;
}) {
  const [kcal, setKcal] = useState(initialKcal || 0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const meals: Record<string, number> = { [mealKey]: kcal };
    const photos = photo ? { [mealKey]: photo } : undefined;
    const res = await postApi('/api/log', { meals, photos });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(kcal);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="rounded-[14px] bg-acc-soft flex items-center justify-center" style={{ width: 46, height: 46, fontSize: 22 }}>
          🍽
        </div>
        <div className="flex-1">
          <div className="font-display" style={{ fontSize: 17, fontWeight: 700 }}>
            {MEAL_LABELS[mealKey]} · kalori gir
          </div>
          <div className="text-t55" style={{ fontSize: 12, fontWeight: 500 }}>
            Tahmini kaloriyi yaz, fotoğraf ekle.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-bg border border-border rounded-[16px]" style={{ padding: '12px 14px', marginTop: 18 }}>
        <button
          type="button"
          onClick={() => setKcal((k) => Math.max(0, k - 50))}
          className="rounded-[12px] border-[1.5px] border-border text-t45 font-display"
          style={{ width: 40, height: 40, fontSize: 20, fontWeight: 700 }}
        >
          −
        </button>
        <div className="text-center">
          <input
            type="number"
            value={kcal || ''}
            onChange={(e) => setKcal(Math.max(0, Number(e.target.value)))}
            placeholder="0"
            inputMode="numeric"
            className="font-display tnum bg-transparent text-center outline-none w-[120px]"
            style={{ fontSize: 26, fontWeight: 700 }}
          />
          <span className="text-t45" style={{ fontSize: 13, fontWeight: 600, marginLeft: 4 }}>
            kcal
          </span>
        </div>
        <button
          type="button"
          onClick={() => setKcal((k) => k + 50)}
          className="rounded-[12px] bg-acc-soft border-[1.5px] border-accent text-accent font-display"
          style={{ width: 40, height: 40, fontSize: 20, fontWeight: 700 }}
        >
          +
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        <PhotoUpload bucket="meal-photos" title="Yemek fotoğrafı" hint="İsteğe bağlı ama şık durur" onUploaded={setPhoto} compact />
      </div>

      {error && (
        <div className="text-bad text-center" style={{ fontSize: 12, marginTop: 12 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="w-full bg-accent text-btntext rounded-[16px] flex items-center justify-center disabled:opacity-60"
        style={{ height: 54, fontSize: 15, fontWeight: 700, marginTop: 16 }}
      >
        {busy ? 'Kaydediliyor…' : `Kaydet · ${formatKLR(kcal)} kcal`}
      </button>
      <button type="button" onClick={onClose} className="w-full text-center text-t45" style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>
        Vazgeç
      </button>
    </BottomSheet>
  );
}
