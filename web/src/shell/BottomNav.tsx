// web/src/shell/BottomNav.tsx
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Início', end: true },
  { to: '/tipster', label: 'IA Tipster', end: false },
  { to: '/perfil', label: 'Perfil', end: false },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? 'nav-item nav-item--active' : 'nav-item')}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
