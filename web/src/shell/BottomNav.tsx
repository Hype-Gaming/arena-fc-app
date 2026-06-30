// web/src/shell/BottomNav.tsx
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/tips', label: 'Tips' },
  { to: '/tipster', label: 'IA Tipster' },
  { to: '/perfil', label: 'Perfil' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => (isActive ? 'nav-item nav-item--active' : 'nav-item')}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
