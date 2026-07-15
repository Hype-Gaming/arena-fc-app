// web/preview.tsx — THROWAWAY: isolated screen preview for screenshots (no auth/router gate)
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import './src/theme.css';
import { BilhetesScreen } from './src/screens/BilhetesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PlanosScreen } from './src/screens/PlanosScreen';
import { TipsterPage } from './src/pages/TipsterPage';
import { BottomNav } from './src/shell/BottomNav';

const params = new URLSearchParams(location.search);
const which = params.get('screen') ?? 'bilhetes';

const mockApi = {
  get: (path: string) => {
    if (path === '/me') return Promise.resolve({ planKey: 'premium', creditBalance: 2 });
    if (path === '/bilhetes') {
      return Promise.resolve({
        plan: { key: 'premium', rank: 1 },
        categorias: [
          { key: 'safes', label: 'Odds Safes', count: 2, locked: false },
          { key: 'pro', label: 'Odds Pró', count: 1, locked: false },
          { key: 'ultra', label: 'Odds Ultra', count: 0, locked: false },
          { key: 'alavancagem', label: 'Alavancagem', count: 1, locked: true },
          { key: 'multiplas', label: 'Múltiplas', count: 1, locked: true },
          { key: 'secundario', label: 'Merc. Secundário', count: 3, locked: true },
          { key: 'ligas', label: 'Ligas Americanas', count: 0, locked: true },
        ],
        bilhetes: [
          {
            id: 'b1', categoria: 'safes', tierLabel: 'Básico', titulo: 'Bilhete Especial',
            homeTeam: 'Flamengo', awayTeam: 'Palmeiras',
            homeColor: null, awayColor: null,
            homeLogo: 'https://media.api-sports.io/football/teams/127.png',
            awayLogo: 'https://media.api-sports.io/football/teams/121.png',
            competition: 'Brasileirão',
            startsAt: new Date(Date.now() + 2.2 * 3_600_000).toISOString(),
            odd: 1.85, resultado: 'pending', deepLink: null,
          },
          {
            id: 'b2', categoria: 'safes', tierLabel: 'Básico', titulo: 'Bilhete Especial',
            homeTeam: 'Botafogo', awayTeam: 'Bahia',
            homeColor: null, awayColor: null,
            homeLogo: 'https://media.api-sports.io/football/teams/120.png',
            awayLogo: 'https://media.api-sports.io/football/teams/118.png',
            competition: 'Brasileirão',
            startsAt: new Date(Date.now() + 6.5 * 3_600_000).toISOString(),
            odd: 1.62, resultado: 'pending', deepLink: null,
          },
          {
            id: 'b3', categoria: 'pro', tierLabel: 'Pró', titulo: 'Bilhete Especial',
            homeTeam: 'Internacional', awayTeam: 'Grêmio',
            homeColor: null, awayColor: null,
            homeLogo: 'https://media.api-sports.io/football/teams/119.png',
            awayLogo: 'https://media.api-sports.io/football/teams/130.png',
            competition: 'Brasileirão',
            startsAt: new Date(Date.now() + 26 * 3_600_000).toISOString(),
            odd: 2.1, resultado: 'pending', deepLink: null,
          },
        ],
      });
    }
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
  if (which === 'nav') {
    return (
      <div style={{ minHeight: 120 }}>
        <BottomNav />
      </div>
    );
  }
  if (which === 'home') return <HomeScreen />;
  if (which === 'planos') return <PlanosScreen api={mockApi} />;
  if (which === 'tipster') return <TipsterPage api={mockApi} />;
  return <BilhetesScreen api={mockApi} />;
}

const wide = which === 'planos' || which === 'tipster' || which === 'bilhetes';

createRoot(document.getElementById('root') as HTMLElement).render(
  <MemoryRouter>
    <div style={{ maxWidth: wide ? 1100 : 430, margin: '0 auto', padding: 16 }}>
      <View />
    </div>
  </MemoryRouter>,
);
