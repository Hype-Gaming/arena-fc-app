// web/src/pages/TipsPage.tsx
import type { ApiClient } from '../lib/apiClient';
import { SportsbookFrame } from '../features/sportsbook/SportsbookFrame';

// POC: the Tips tab now embeds the Esportiva sportsbook. The credit-gated tips
// feed (TipsScreen) remains available in the codebase for reuse.
export function TipsPage(_props: { api: ApiClient }) {
  return <SportsbookFrame />;
}
