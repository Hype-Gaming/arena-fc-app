// web/src/shell/AppShell.tsx
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
