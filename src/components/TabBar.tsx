'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Ana' },
  { href: '/market', label: 'Piyasa' },
  { href: '/portfolio', label: 'Portföy' },
  { href: '/social', label: 'Sosyal' },
  { href: '/profile', label: 'Profil' },
] as const;

/** Bottom navigation — 5 tabs, active tab highlighted from the current route. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="flex justify-around items-center bg-[color:var(--tabbg)] border-t border-border"
      style={{ padding: '10px 8px 26px', backdropFilter: 'blur(8px)' }}
    >
      {TABS.map((t) => {
        const active = t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className="flex flex-col items-center gap-[3px]"
            aria-current={active ? 'page' : undefined}
          >
            <span
              className={`rounded-md ${active ? 'bg-accent' : 'bg-track'}`}
              style={{ width: 20, height: 20 }}
            />
            <span
              className={active ? 'text-accent' : 'text-t45'}
              style={{ fontSize: 10, fontWeight: active ? 700 : 600 }}
            >
              {t.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
