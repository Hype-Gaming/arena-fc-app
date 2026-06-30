// web/src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { TipsPage } from './pages/TipsPage';
import { TipsterPage } from './pages/TipsterPage';
import { PerfilPage } from './pages/PerfilPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/tips" replace />} />
        <Route path="tips" element={<TipsPage />} />
        <Route path="tipster" element={<TipsterPage />} />
        <Route path="perfil" element={<PerfilPage />} />
        <Route path="*" element={<Navigate to="/tips" replace />} />
      </Route>
    </Routes>
  );
}
