// web/src/shell/AppShell.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { AppShell } from './AppShell';

// Unit test of the shell chrome in isolation: it must render the routed child
// (Outlet) alongside the persistent bottom navigation. Full auth-gated routing
// is covered by App.test.tsx.
function renderShellWithChild() {
  return render(
    <MemoryRouter initialEntries={['/child']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="child" element={<p>conteúdo da rota</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('renders the routed child inside the shell', () => {
    renderShellWithChild();
    expect(screen.getByText('conteúdo da rota')).toBeInTheDocument();
  });

  it('renders the persistent bottom navigation with the three tabs', () => {
    renderShellWithChild();
    expect(
      screen.getByRole('navigation', { name: /navegação principal/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ia tipster/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /perfil/i })).toBeInTheDocument();
  });
});
