// web/src/pages/TipsPage.tsx
import { useNavigate } from 'react-router-dom';
import type { ApiClient } from '../lib/apiClient';
import { TipsScreen } from '../screens/TipsScreen';

export function TipsPage({ api }: { api: ApiClient }) {
  const navigate = useNavigate();
  return <TipsScreen api={api} onBuyCredits={() => navigate('/perfil')} />;
}
