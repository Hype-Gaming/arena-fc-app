// web/src/pages/TipsterPage.tsx
import { useNavigate } from 'react-router-dom';
import type { ApiClient } from '../lib/apiClient';
import { TipsterChat } from '../features/tipster/TipsterChat';

// TipsterChat manages its own API via the tipster module; `api` is accepted for
// a uniform page signature but not needed here.
export function TipsterPage({ api: _api }: { api: ApiClient }) {
  const navigate = useNavigate();
  return (
    <section className="page">
      <h1>IA Tipster</h1>
      <TipsterChat onBuyCredits={() => navigate('/perfil')} />
    </section>
  );
}
