// web/src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { api as defaultApi, type ApiClient } from './lib/apiClient';
import { TutorialOverlay } from './components/TutorialOverlay';
import { LoginScreen } from './screens/LoginScreen';
import { AppShell } from './shell/AppShell';
import { TipsPage } from './pages/TipsPage';
import { TipsterPage } from './pages/TipsterPage';
import { PerfilPage } from './pages/PerfilPage';
import { PlanosPage } from './pages/PlanosPage';
import { AdminPage } from './admin/AdminPage';

interface Props {
  api?: ApiClient;
}

function Gate({ api }: { api: ApiClient }) {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen api={api} onLogin={login} />;
  }

  return (
    <>
      <TutorialOverlay />
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/tips" replace />} />
          <Route path="tips" element={<TipsPage api={api} />} />
          <Route path="tipster" element={<TipsterPage api={api} />} />
          <Route
            path="perfil"
            element={<PerfilPage api={api} onLogout={logout} />}
          />
          <Route path="planos" element={<PlanosPage api={api} />} />
          <Route path="*" element={<Navigate to="/tips" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export function App({ api = defaultApi }: Props) {
  return (
    <AuthProvider>
      <Gate api={api} />
    </AuthProvider>
  );
}
