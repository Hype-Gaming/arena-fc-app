// web/src/pages/PlanosPage.tsx
import type { ApiClient } from '../shared/lib/apiClient';
import { PlanosScreen } from '../screens/PlanosScreen';

export function PlanosPage({ api }: { api: ApiClient }) {
  return <PlanosScreen api={api} />;
}
