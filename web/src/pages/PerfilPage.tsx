// web/src/pages/PerfilPage.tsx
import { useNavigate } from 'react-router-dom';
import type { ApiClient } from '../shared/lib/apiClient';
import { PerfilScreen } from '../screens/PerfilScreen';

export function PerfilPage({
  api,
  onLogout,
}: {
  api: ApiClient;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  return (
    <PerfilScreen
      api={api}
      onLogout={onLogout}
      onUpgrade={() => navigate('/planos')}
    />
  );
}
