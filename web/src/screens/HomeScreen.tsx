// web/src/screens/HomeScreen.tsx
import { useNavigate } from 'react-router-dom';
import './HomeScreen.css';

type Accent = 'gold' | 'blue' | 'muted';
type Tone = 'gold' | 'blue' | 'green';

interface Badge {
  label: string;
  tone: Tone;
}

interface HomeCard {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof ICONS;
  accent: Accent;
  badges: Badge[];
  ctaLabel: string;
  ctaVariant: 'solid' | 'outline';
  to: string;
  featured?: boolean;
  locked?: boolean;
}

interface Section {
  title: string;
  icon?: keyof typeof ICONS;
  cards: HomeCard[];
}

const SECTIONS: Section[] = [
  {
    title: 'Principais',
    cards: [
      {
        key: 'futebol',
        title: 'Futebol',
        subtitle: 'Acesse as melhores entradas do dia',
        icon: 'ball',
        accent: 'gold',
        featured: true,
        badges: [{ label: 'IA Ativada', tone: 'gold' }],
        ctaLabel: 'Acessar',
        ctaVariant: 'solid',
        to: '/bilhetes',
      },
      {
        key: 'ia-tempo-real',
        title: 'Análises de IA em tempo real',
        subtitle: 'Pergunte sobre qualquer jogo ou escolha uma partida ao vivo.',
        icon: 'robot',
        accent: 'blue',
        badges: [
          { label: 'Novo', tone: 'gold' },
          { label: 'Beta', tone: 'blue' },
        ],
        ctaLabel: 'Testar a IA Tipster',
        ctaVariant: 'solid',
        to: '/tipster',
      },
    ],
  },
  {
    title: 'Acesso rápido',
    icon: 'bolt',
    cards: [
      {
        key: 'altas',
        title: 'Odds Altas',
        subtitle: 'Desbloqueie para acessar',
        icon: 'lock',
        accent: 'muted',
        locked: true,
        badges: [{ label: 'IA Ativada', tone: 'gold' }],
        ctaLabel: 'Desbloquear',
        ctaVariant: 'outline',
        to: '/planos',
      },
      {
        key: 'alavancagem',
        title: 'Alavancagem',
        subtitle: 'Desbloqueie para acessar',
        icon: 'lock',
        accent: 'muted',
        locked: true,
        badges: [{ label: 'IA Ativada', tone: 'gold' }],
        ctaLabel: 'Desbloquear',
        ctaVariant: 'outline',
        to: '/planos',
      },
    ],
  },
  {
    title: 'Últimos ingressos',
    icon: 'tv',
    cards: [
      {
        key: 'greens',
        title: 'Últimos Greens',
        subtitle: 'Veja os ingressos que bateram',
        icon: 'trophy',
        accent: 'gold',
        badges: [{ label: 'Verdes', tone: 'green' }],
        ctaLabel: 'Visualização histórica',
        ctaVariant: 'solid',
        to: '/bilhetes',
      },
    ],
  },
];

export function HomeScreen() {
  const navigate = useNavigate();

  return (
    <main className="home">
      <div className="home__inner">
        {SECTIONS.map((section) => (
          <section key={section.title} className="home-section">
            <h2 className="home-section__title">
              {section.icon && <Icon name={section.icon} />}
              {section.title}
            </h2>
            <div className="home-section__cards">
              {section.cards.map((card) => (
                <Card key={card.key} card={card} onOpen={() => navigate(card.to)} />
              ))}
            </div>
          </section>
        ))}

        <footer className="home-footer">
          <div className="home-footer__brand">
            Premier <span>FC</span> <Icon name="gear" />
          </div>
          <p className="home-footer__line">Análises processadas continuamente</p>
          <p className="home-footer__fine">
            Dados protegidos • 18+ • Jogue com responsabilidade
          </p>
          <p className="home-footer__links">
            <a href="#termos">Termos e Privacidade</a>
            <span aria-hidden="true"> | </span>
            <a href="#apoiar">Apoiar</a>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Card({ card, onOpen }: { card: HomeCard; onOpen: () => void }) {
  return (
    <article
      className="hcard"
      data-accent={card.accent}
      data-featured={card.featured ? 'true' : undefined}
      data-locked={card.locked ? 'true' : undefined}
    >
      <div className="hcard__thumb">
        <Icon name={card.icon} />
        {card.locked && (
          <span className="hcard__lock" aria-hidden="true">
            <Icon name="lock" />
          </span>
        )}
      </div>

      <div className="hcard__body">
        <div className="hcard__badges">
          {card.badges.map((b) => (
            <span key={b.label} className="hbadge" data-tone={b.tone}>
              {b.label}
            </span>
          ))}
        </div>
        <h3 className="hcard__title">{card.title}</h3>
        <p className="hcard__subtitle">{card.subtitle}</p>
        <button
          type="button"
          className="hcard__cta"
          data-variant={card.ctaVariant}
          onClick={onOpen}
        >
          {card.ctaLabel}
        </button>
      </div>
    </article>
  );
}

/* ---- inline icons ---- */
const ICONS = {
  ball: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.4l3.1 2.3-1.2 3.7h-3.8L8.9 9.7 12 7.4z" fill="currentColor" />
      <path
        d="M12 3v2M5 9l1.7 1M19 9l-1.7 1M7.2 19.5l1.1-2M16.8 19.5l-1.1-2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </>
  ),
  robot: (
    <>
      <rect x="4.5" y="8" width="15" height="10" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4.5V8M8.5 12.5h.01M15.5 12.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="4" r="1.2" fill="currentColor" />
      <path d="M9.5 15.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3M12 13v3M9 20h6M10 20l.5-2.5h3L14 20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  bolt: <path d="M13 2L4.5 13.5H11l-1 8.5L18.5 10H12l1-8z" fill="currentColor" />,
  tv: (
    <>
      <rect x="3.5" y="7" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4l4 3 4-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M19.8 7.5l-1.9 1.1M6.1 15.4l-1.9 1.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

