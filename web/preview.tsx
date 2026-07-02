// web/preview.tsx — THROWAWAY: isolated screen preview for screenshots (no auth/router gate)
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import './src/theme.css';
import { BilhetesScreen } from './src/screens/BilhetesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PlanosScreen } from './src/screens/PlanosScreen';
import { TipsterPage } from './src/pages/TipsterPage';

const params = new URLSearchParams(location.search);
const which = params.get('screen') ?? 'bilhetes';

const mockApi = {
  get: (path: string) => {
    if (path === '/me') return Promise.resolve({ planKey: 'premium', creditBalance: 2 });
    return Promise.resolve({});
  },
} as never;

// Mock the tips feed so TipsterChat's upcoming-match suggestions render.
const FEED = {
  categories: [
    {
      matches: [
        { id: 'm1', homeTeam: 'Estados Unidos', awayTeam: 'Bósnia e Herzegovina', competition: 'Copa do Mundo', startsAt: '2026-07-01T21:00:00-03:00', status: 'scheduled' },
        { id: 'm2', homeTeam: 'Espanha', awayTeam: 'Áustria', competition: 'Copa do Mundo', startsAt: '2026-07-02T16:00:00-03:00', status: 'scheduled' },
        { id: 'm3', homeTeam: 'Portugal', awayTeam: 'Croácia', competition: 'Copa do Mundo', startsAt: '2026-07-02T20:00:00-03:00', status: 'scheduled' },
        { id: 'm4', homeTeam: 'Suíça', awayTeam: 'Argélia', competition: 'Copa do Mundo', startsAt: '2026-07-03T00:00:00-03:00', status: 'scheduled' },
        { id: 'm5', homeTeam: 'Austrália', awayTeam: 'Egito', competition: 'Copa do Mundo', startsAt: '2026-07-03T15:00:00-03:00', status: 'scheduled' },
      ],
    },
  ],
};
const realFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes('/tips/feed')) {
    return Promise.resolve(
      new Response(JSON.stringify(FEED), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
  return realFetch(input, init);
}) as typeof window.fetch;

function View() {
  if (which === 'home') return <HomeScreen />;
  if (which === 'planos') return <PlanosScreen api={mockApi} />;
  if (which === 'tipster') return <TipsterPage api={mockApi} />;
  if (which === 'bilhetes-diamante') return <BilhetesScreen planKey="diamante" />;
  return <BilhetesScreen planKey="premium" />;
}

const wide = which === 'planos' || which === 'tipster';

createRoot(document.getElementById('root') as HTMLElement).render(
  <MemoryRouter>
    <div style={{ maxWidth: wide ? 1100 : 430, margin: '0 auto', padding: 16 }}>
      <View />
    </div>
  </MemoryRouter>,
);
