'use client';
import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type PhotoBucket = 'meal-photos' | 'weigh-photos' | 'avatars';

/**
 * Uploads an image to a Supabase Storage bucket under `<uid>/<ts>.<ext>` and
 * returns the stored path via `onUploaded`. Renders as a tappable dashed tile.
 */
export function PhotoUpload({
  bucket,
  onUploaded,
  title = 'Fotoğraf',
  hint,
  compact = false,
}: {
  bucket: PhotoBucket;
  onUploaded: (path: string) => void;
  title?: string;
  hint?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setPreview(URL.createObjectURL(file));
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? 'anon';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (upErr) throw upErr;
      onUploaded(path);
    } catch {
      setError('Yükleme başarısız. Tekrar dene.');
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="w-full text-left border-[1.5px] border-dashed border-dash rounded-[18px] flex items-center gap-3"
      style={{ padding: 16 }}
    >
      <span
        className="rounded-[12px] bg-ph overflow-hidden flex-none bg-cover bg-center"
        style={{
          width: compact ? 48 : 52,
          height: compact ? 48 : 52,
          backgroundImage: preview ? `url(${preview})` : undefined,
        }}
      />
      <span className="flex-1">
        <span className="block text-text" style={{ fontSize: 13, fontWeight: 700 }}>
          {title}
        </span>
        <span className="block text-t45" style={{ fontSize: 11, fontWeight: 500 }}>
          {error ?? (busy ? 'Yükleniyor…' : preview ? 'Yüklendi ✓' : hint ?? 'Dokun ve foto ekle')}
        </span>
      </span>
      <span className="text-accent" style={{ fontSize: 12, fontWeight: 700 }}>
        {busy ? '…' : 'Yükle'}
      </span>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
    </button>
  );
}
