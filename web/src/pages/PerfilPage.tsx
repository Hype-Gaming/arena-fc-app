// web/src/pages/PerfilPage.tsx
import type { ApiClient } from '../lib/apiClient';
import { PerfilScreen } from '../screens/PerfilScreen';

export function PerfilPage({
  api,
  onLogout,
}: {
  api: ApiClient;
  onLogout: () => void;
}) {
  return <PerfilScreen api={api} onLogout={onLogout} />;
}
