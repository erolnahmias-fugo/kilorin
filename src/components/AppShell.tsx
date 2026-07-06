import type { ReactNode } from 'react';
import { TabBar } from './TabBar';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

/**
 * Full-viewport phone-width column. Scrollable content region + optional bottom
 * tab bar. Individual screens supply their own inner padding to match the design.
 */
export function AppShell({
  children,
  tab = true,
  scroll = true,
}: {
  children: ReactNode;
  tab?: boolean;
  scroll?: boolean;
}) {
  return (
    <div className="app-shell bg-bg text-text">
      <ServiceWorkerRegister />
      <div className={`flex-1 min-h-0 flex flex-col ${scroll ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {children}
      </div>
      {tab && <TabBar />}
    </div>
  );
}
