// web/src/screens/HomeScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { ExplainerModal } from './ExplainerModal';
import { CATEGORY_EXPLAINERS } from './categoryExplainers';
import './HomeScreen.css';

type Accent = 'gold' | 'blue' | 'muted' | 'green';
type Tone = 'gold' | 'blue' | 'green';
type Layout = 'hero' | 'telegram' | 'tile';

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
  to?: string;
  externalTo?: string;
  featured?: boolean;
  locked?: boolean;
  visual?: 'tipster' | 'ai' | 'locked' | 'greens';
  image?: string;
  layout?: Layout;
  /** Opens the "how it works" popup (keyed into CATEGORY_EXPLAINERS) instead
   *  of navigating — used by the locked "Desbloquear" cards. */
  explainerKey?: string;
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
        key: 'entradas-dia',
        title: 'Entradas do Dia',
        subtitle: 'Acesse as melhores entradas do dia',
        icon: 'robot',
        accent: 'gold',
        featured: true,
        badges: [{ label: 'IA Ativada', tone: 'gold' }],
        ctaLabel: 'Acessar',
        ctaVariant: 'solid',
        to: '/bilhetes',
        visual: 'tipster',
        image: '/entradas-do-dia.png',
        layout: 'hero',
      },
      {
        key: 'ia-tempo-real',
        title: 'Analises de IA em tempo real',
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
        visual: 'ai',
        image: '/analise-de-ia.png',
        layout: 'hero',
      },
    ],
  },
  {
    title: 'Acesso Rápido',
    icon: 'bolt',
    cards: [
      {
        key: 'telegram-vip',
        title: 'Grupo Telegram VIP',
        subtitle: 'Sinais liberados, alertas ao vivo e entradas exclusivas',
        icon: 'bolt',
        accent: 'green',
        badges: [
          { label: 'Liberado', tone: 'green' },
          { label: 'Ao vivo', tone: 'gold' },
        ],
        ctaLabel: 'Entrar',
        ctaVariant: 'solid',
        externalTo: (import.meta.env as Record<string, string | undefined>).VITE_TELEGRAM_URL ?? 'https://t.me/+arena_fc',
        layout: 'telegram',
      },
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
        explainerKey: 'ultra',
        visual: 'locked',
        image: '/odds-altas.png',
        layout: 'tile',
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
        explainerKey: 'alavancagem',
        visual: 'locked',
        image: '/Alavancagem.png',
        layout: 'tile',
      },
    ],
  },
  {
    title: 'Ultimos Bilhetes',
    icon: 'tv',
    cards: [
      {
        key: 'greens',
        title: 'Ultimos Greens',
        subtitle: 'Veja os bilhetes que bateram',
        icon: 'trophy',
        accent: 'gold',
        badges: [{ label: 'Greens', tone: 'green' }],
        ctaLabel: 'Ver historico',
        ctaVariant: 'solid',
        to: '/ultimos-greens',
        visual: 'greens',
        image: '/ultimos-greens.png',
        layout: 'hero',
      },
    ],
  },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const [explainerKey, setExplainerKey] = useState<string | null>(null);

  function openCard(card: HomeCard) {
    // Locked cards with an explainer ("Desbloquear" on Odds Altas / Alavancagem)
    // open the "how it works" popup that funnels to plans, instead of jumping
    // straight to the paywall.
    if (card.explainerKey && CATEGORY_EXPLAINERS[card.explainerKey]) {
      setExplainerKey(card.explainerKey);
      return;
    }
    if (card.externalTo) {
      window.open(card.externalTo, '_blank', 'noopener,noreferrer');
      return;
    }
    if (card.to) navigate(card.to);
  }

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
                <Card key={card.key} card={card} onOpen={() => openCard(card)} />
              ))}
            </div>
          </section>
        ))}

        <footer className="home-footer">
          <div className="home-footer__brand">
            Premier Ultra <span>©</span>
          </div>
          <p className="home-footer__line">Analises processadas continuamente</p>
          <p className="home-footer__fine">
            Dados protegidos - 18+ - Jogue com responsabilidade
          </p>
          <p className="home-footer__links">
            <a href="#termos">Termos e Privacidade</a>
            <span aria-hidden="true"> | </span>
            <a href="#apoiar">Apoiar</a>
          </p>
        </footer>
      </div>

      <ExplainerModal
        explainer={explainerKey ? CATEGORY_EXPLAINERS[explainerKey] : null}
        onClose={() => setExplainerKey(null)}
        onInterest={() => {
          setExplainerKey(null);
          navigate('/planos');
        }}
      />
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
      data-visual={card.visual}
      style={card.image ? ({ '--h-thumb-image': `url(${card.image})` } as CSSProperties) : undefined}
      data-layout={card.layout ?? 'hero'}
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
