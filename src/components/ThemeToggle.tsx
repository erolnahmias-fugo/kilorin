'use client';
import { useTheme } from '@/app/providers';

/** Light/dark segmented toggle wired to the ThemeProvider. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-2 bg-surface border border-border rounded-[14px]" style={{ padding: 4 }}>
      {(['light', 'dark'] as const).map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            className={active ? 'bg-acc-soft text-accent' : 'text-t55'}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 11,
              border: active ? '1.5px solid var(--accent)' : '1.5px solid transparent',
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>{t === 'light' ? '☀️' : '🌙'}</span>
            {t === 'light' ? 'Aydınlık' : 'Karanlık'}
          </button>
        );
      })}
    </div>
  );
}
