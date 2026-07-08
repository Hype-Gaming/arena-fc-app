// web/src/shell/AppShell.tsx
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { FreeOddCta } from './FreeOddCta';

export function AppShell() {
  return (
    <div className="app-shell">
      <TopBar />
      <FreeOddCta />
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
