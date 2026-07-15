// web/src/pages/BilhetesPage.tsx
import type { ApiClient } from '../lib/apiClient';
import { BilhetesScreen } from '../screens/BilhetesScreen';

export function BilhetesPage({ api }: { api: ApiClient }) {
  return <BilhetesScreen api={api} />;
}
