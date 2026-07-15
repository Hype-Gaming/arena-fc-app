// web/src/shell/BottomNav.tsx
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Tips', icon: TrophyIcon, end: true },
  { to: '/tipster', label: 'IA Tipster', icon: StarIcon, end: false },
  { to: '/perfil', label: 'Perfil', icon: UserIcon, end: false },
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
          <tab.icon />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/* ---- icons ---- */
function TrophyIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17 4V2H7v2H3v3a4 4 0 0 0 4 4h.35A5.5 5.5 0 0 0 11 13.9V17H8.5a1 1 0 0 0-.97.76L7 20h10l-.53-2.24a1 1 0 0 0-.97-.76H13v-3.1A5.5 5.5 0 0 0 16.65 11H17a4 4 0 0 0 4-4V4h-4ZM5 7V6h2v3.5A2 2 0 0 1 5 7Zm14 0a2 2 0 0 1-2 2.5V6h2v1ZM6 22h12v-1H6v1Z" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.65 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.58-4.78-4.65 6.6-.96L12 2.5z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.1 0-7.5 2.6-7.5 5.8 0 .66.54 1.2 1.2 1.2h12.6c.66 0 1.2-.54 1.2-1.2 0-3.2-3.4-5.8-7.5-5.8Z" />
    </svg>
  );
}
