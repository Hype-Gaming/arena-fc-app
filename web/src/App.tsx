// web/src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { api as defaultApi, type ApiClient } from './lib/apiClient';
import { Onboarding } from './components/Onboarding';
import { TelegramGateProvider } from './components/TelegramGate';
import { LoginScreen } from './screens/LoginScreen';
import { AppShell } from './shell/AppShell';
import { HomePage } from './pages/HomePage';
import { TipsPage } from './pages/TipsPage';
import { BilhetesPage } from './pages/BilhetesPage';
import { TipsterPage } from './pages/TipsterPage';
import { PerfilPage } from './pages/PerfilPage';
import { PlanosPage } from './pages/PlanosPage';
import { UltimosGreensPage } from './pages/UltimosGreensPage';
import { AdminPage } from './admin/AdminPage';

interface Props {
  api?: ApiClient;
}

function Gate({ api }: { api: ApiClient }) {
  const { isAuthenticated, login, logout } = useAuth();

  return (
    <>
      {isAuthenticated && <Onboarding api={api} />}
      <Routes>
        {/* Login is its own route. Authenticated users are bounced to the home hub. */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginScreen api={api} onLogin={login} />
            )
          }
        />

        {isAuthenticated ? (
          <>
            <Route path="/admin" element={<AdminPage />} />
            <Route
              element={
                <TelegramGateProvider api={api}>
                  <AppShell />
                </TelegramGateProvider>
              }
            >
              <Route index element={<HomePage api={api} />} />
              <Route path="bilhetes" element={<BilhetesPage api={api} />} />
              <Route path="tips" element={<TipsPage api={api} />} />
              <Route path="tipster" element={<TipsterPage api={api} />} />
              <Route
                path="perfil"
                element={<PerfilPage api={api} onLogout={logout} />}
              />
              <Route path="planos" element={<PlanosPage api={api} />} />
              <Route
                path="ultimos-greens"
                element={<UltimosGreensPage api={api} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
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
