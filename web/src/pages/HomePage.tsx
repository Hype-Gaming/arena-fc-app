// web/src/pages/HomePage.tsx
import type { ApiClient } from '../lib/apiClient';
import { HomeScreen } from '../screens/HomeScreen';

export function HomePage({ api }: { api?: Pick<ApiClient, 'get'> }) {
  return <HomeScreen api={api} />;
}
