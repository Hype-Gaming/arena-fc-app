// web/src/shell/BottomNav.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders exactly the three MVP tabs with correct routes', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BottomNav />
      </MemoryRouter>,
    );
    const tips = screen.getByRole('link', { name: /^tips$/i });
    const tipster = screen.getByRole('link', { name: /ia tipster/i });
    const perfil = screen.getByRole('link', { name: /perfil/i });

    expect(tips).toHaveAttribute('href', '/');
    expect(tipster).toHaveAttribute('href', '/tipster');
    expect(perfil).toHaveAttribute('href', '/perfil');
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('marks the active tab via aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /perfil/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('keeps Tips inactive when on another route (exact match only)', () => {
    render(
      <MemoryRouter initialEntries={['/perfil']}>
        <BottomNav />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /^tips$/i }),
    ).not.toHaveAttribute('aria-current');
  });
});
