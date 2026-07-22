// web/src/pages/UltimosGreensPage.tsx
import type { ApiClient } from '../shared/lib/apiClient';
import { UltimosGreensScreen } from '../screens/UltimosGreensScreen';

export function UltimosGreensPage({ api }: { api: ApiClient }) {
  return <UltimosGreensScreen api={api} />;
}
