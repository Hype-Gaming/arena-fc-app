// web/src/shell/AppShell.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { App } from '../App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AppShell routing', () => {
  it('renders the Tips page at /tips inside the shell with nav', () => {
    renderAt('/tips');
    expect(screen.getByRole('heading', { name: /tips/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /navegação principal/i })).toBeInTheDocument();
  });

  it('renders the IA Tipster page at /tipster', () => {
    renderAt('/tipster');
    expect(screen.getByRole('heading', { name: /ia tipster/i })).toBeInTheDocument();
  });

  it('renders the Perfil page at /perfil', () => {
    renderAt('/perfil');
    expect(screen.getByRole('heading', { name: /perfil/i })).toBeInTheDocument();
  });

  it('redirects unknown root path to /tips', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /tips/i })).toBeInTheDocument();
  });
});
