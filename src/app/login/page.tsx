'use client';
import { useState } from 'react';
import { Coin } from '@/components/Coin';
import { MedicalDisclaimer } from '@/components/MedicalDisclaimer';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (err) throw err;
      setSent(true);
    } catch {
      setError('Bağlantı gönderilemedi. E-postanı kontrol et.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell bg-bg text-text">
      <div className="flex-1 flex flex-col items-center text-center" style={{ padding: '110px 26px 0' }}>
        <Coin size={64} flip style={{ boxShadow: '0 4px 18px rgba(184,134,11,.4)' }} />
        <div className="font-display" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', marginTop: 16 }}>
          Kilorin
        </div>
        <div className="text-t55" style={{ fontSize: 13.5, fontWeight: 500, marginTop: 6, maxWidth: 250 }}>
          Arkadaşlarınla kilo ver, KLR bas, hepsini kumarda kaybet.
        </div>

        {sent ? (
          <div className="w-full bg-surface border border-border rounded-[18px] shadow-card" style={{ padding: 22, marginTop: 44 }}>
            <div style={{ fontSize: 32 }}>📬</div>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 700, marginTop: 8 }}>
              Bağlantı yolda
            </div>
            <div className="text-t55" style={{ fontSize: 12.5, fontWeight: 500, marginTop: 6 }}>
              <b>{email}</b> adresine bir giriş bağlantısı gönderdik. Postanı aç, dokun, içeri gel.
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="w-full" style={{ marginTop: 44 }}>
            <div className="text-t45" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textAlign: 'left' }}>
              E-POSTA
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sen@ornek.com"
              className="w-full bg-surface border-[1.5px] border-acc-border rounded-[14px] shadow-card outline-none"
              style={{ padding: '15px 16px', fontSize: 15, fontWeight: 600, marginTop: 8 }}
            />
            {error && <div className="text-bad text-left" style={{ fontSize: 12, marginTop: 8 }}>{error}</div>}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-accent text-btntext rounded-[16px] flex items-center justify-center disabled:opacity-60"
              style={{ height: 54, fontSize: 15, fontWeight: 700, marginTop: 16 }}
            >
              {busy ? 'Gönderiliyor…' : 'Sihirli bağlantı gönder'}
            </button>
          </form>
        )}
      </div>
      <div style={{ padding: '0 22px 40px' }}>
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
