// web/preview.tsx — THROWAWAY: isolated screen preview for screenshots (no auth/router gate)
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import './src/theme.css';
import { BilhetesScreen } from './src/screens/BilhetesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { PlanosScreen } from './src/screens/PlanosScreen';

const params = new URLSearchParams(location.search);
const which = params.get('screen') ?? 'bilhetes';

const mockApi = { get: () => Promise.resolve({ planKey: 'premium' }) } as never;

function View() {
  if (which === 'home') return <HomeScreen />;
  if (which === 'planos') return <PlanosScreen api={mockApi} />;
  if (which === 'bilhetes-diamante') return <BilhetesScreen planKey="diamante" />;
  return <BilhetesScreen planKey="premium" />;
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <MemoryRouter>
    <div style={{ maxWidth: 430, margin: '0 auto' }}>
      <View />
    </div>
  </MemoryRouter>,
);
