// web/src/shell/AppShell.tsx
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
