// web/src/pages/TipsterPage.tsx — IA Tipster screen: header, tabs, chat
import { useEffect, useState, type ReactNode } from 'react';
import type { ApiClient } from '../lib/apiClient';
import { TipsterChat } from '../features/tipster/TipsterChat';
import { TipsterLive } from '../features/tipster/TipsterLive';
import { BuyCreditsModal } from '../features/tipster/BuyCreditsModal';
import '../features/tipster/TipsterScreen.css';

type Tab = 'chat' | 'aovivo' | 'tutorial';

interface MeProfile {
  creditBalance: number;
  iaUnlimited?: boolean;
}

export function TipsterPage({ api }: { api: ApiClient }) {
  const [tab, setTab] = useState<Tab>('chat');
  const [credits, setCredits] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => {
    api
      .get<MeProfile>('/me')
      .then((me) => {
        setCredits(me.creditBalance);
        setUnlimited(!!me.iaUnlimited);
      })
      .catch(() => setCredits(null));
  }, [api]);

  return (
    <section className="tst">
      <header className="tst-head">
        <div className="tst-head__title">
          <span className="tst-head__spark" aria-hidden="true">
            <SparkSmall />
          </span>
          <h1>IA Tipster</h1>
          <span className="tst-head__beta">BETA</span>
        </div>
        {unlimited ? (
          <button
            type="button"
            className="tst-head__credits tst-head__credits--unlimited"
            onClick={() => setBuyOpen(true)}
            title="Acesso ilimitado ativo"
          >
            <InfinityIcon /> Ilimitado
          </button>
        ) : (
          credits !== null && (
            <button
              type="button"
              className="tst-head__credits"
              onClick={() => setBuyOpen(true)}
              title="Comprar créditos IA"
            >
              <CoinsIcon /> {credits} {credits === 1 ? 'crédito' : 'créditos'}
            </button>
          )
        )}
      </header>

      <nav className="tst-tabs" aria-label="Seções do IA Tipster">
        <button
          type="button"
          className="tst-tab"
          data-active={tab === 'chat'}
          onClick={() => setTab('chat')}
        >
          <ChatIcon /> Chat
        </button>
        <button
          type="button"
          className="tst-tab"
          data-active={tab === 'aovivo'}
          onClick={() => setTab('aovivo')}
        >
          <RadioIcon /> Ao Vivo
        </button>
        <button
          type="button"
          className="tst-tab"
          data-active={tab === 'tutorial'}
          onClick={() => setTab('tutorial')}
        >
          <BookIcon /> Tutorial
        </button>
      </nav>

      {tab === 'chat' && (
        <TipsterChat
          onBuyCredits={() => setBuyOpen(true)}
          onBalance={(b) => setCredits(b)}
        />
      )}
      {tab === 'aovivo' && (
        <TipsterLive
          onBuyCredits={() => setBuyOpen(true)}
          onBalance={(b) => setCredits(b)}
        />
      )}
      {tab === 'tutorial' && <TutorialGuide />}

      <BuyCreditsModal open={buyOpen} onClose={() => setBuyOpen(false)} />
    </section>
  );
}

/* ---- Tutorial guide (Como usar a IA Tipster) ---- */
function TutorialGuide() {
  const steps = [
    {
      title: 'Escolha o jogo',
      body: "Na aba Chat, digite os times (ex.: 'Flamengo x Palmeiras'). No Ao Vivo, escolha um jogo da lista.",
    },
    {
      title: 'Gere a análise',
      body: 'A IA estuda forma, histórico, lesões e estatísticas em segundos. Cada análise consome 1 crédito.',
    },
    {
      title: 'Aposte na Esportiva Bet',
      body: 'Com a análise em mãos, abra direto o evento na Esportiva Bet pra montar sua aposta.',
    },
  ];

  const tabs = [
    {
      icon: <ChatIcon />,
      label: 'Chat',
      body: 'Pra qualquer jogo dos próximos 15 dias. Você escolhe o que analisar.',
    },
    {
      icon: <RadioIcon />,
      label: 'Ao Vivo',
      body: 'Pra partidas rolando agora. Análise atualizada com o que tá acontecendo no jogo.',
    },
  ];

  const credits = [
    {
      icon: <CalendarIcon />,
      title: 'Cota semanal',
      body: 'Você recebe créditos toda semana de acordo com seu plano. Reset toda segunda.',
      price: 'Grátis',
    },
    {
      icon: <PackageIcon />,
      title: 'Pacotes extras',
      body: 'Comprou? Vira saldo permanente. Use quando quiser, não expira.',
      price: 'A partir de R$ 29,90',
    },
    {
      icon: <InfinityIcon />,
      title: 'Acesso ilimitado',
      body: 'Análises sem contar créditos por 1 ou 3 meses. Pra quem usa muito.',
      price: 'A partir de R$ 89,90',
    },
  ];

  const tips = [
    {
      icon: <ThumbsUpIcon />,
      title: 'Use os feedbacks 👍 👎',
      body: 'Eles ajudam a IA a aprender o que funciona pra você. Análise ruim? Polegar pra baixo + reporte.',
    },
    {
      icon: <RefreshIcon />,
      title: 'Repita análises do mesmo jogo',
      body: 'Próximo ao apito, dados mudam (escalações, lesões). Vale gerar de novo se mudou contexto.',
    },
    {
      icon: <ExternalLinkIcon />,
      title: 'Abra direto na Esportiva Bet',
      body: "O botão 'Abrir Esportiva Bet' já te leva no evento certo do jogo analisado. Sem cliques extras.",
    },
  ];

  return (
    <div className="tst-guide">
      <header className="tst-guide__hero">
        <span className="tst-guide__badge" aria-hidden="true">
          <SparkSmall />
        </span>
        <h2>Como usar a IA Tipster</h2>
        <p>
          Análises inteligentes de futebol em segundos, baseadas em dados reais.
          Aqui vai um guia rápido pra você tirar o máximo.
        </p>
      </header>

      <section className="tst-guide__block">
        <h3 className="tst-guide__eyebrow">
          <SparkSmall /> Em 3 passos
        </h3>
        <ol className="tst-guide__steps">
          {steps.map((s, i) => (
            <li key={s.title} className="tst-step">
              <span className="tst-step__num">{i + 1}</span>
              <div>
                <p className="tst-step__title">{s.title}</p>
                <p className="tst-step__body">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="tst-guide__block">
        <h3 className="tst-guide__eyebrow">
          <RadioIcon /> Quando usar cada aba
        </h3>
        <div className="tst-guide__cols">
          {tabs.map((t) => (
            <div key={t.label} className="tst-usecard">
              <span className="tst-usecard__icon">{t.icon}</span>
              <p className="tst-usecard__label">{t.label}</p>
              <p className="tst-usecard__body">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="tst-guide__block">
        <h3 className="tst-guide__eyebrow">
          <CoinsIcon /> Como funcionam os créditos
        </h3>
        <ul className="tst-guide__rows">
          {credits.map((c) => (
            <li key={c.title} className="tst-row">
              <span className="tst-row__icon">{c.icon}</span>
              <div className="tst-row__text">
                <p className="tst-row__title">{c.title}</p>
                <p className="tst-row__body">{c.body}</p>
              </div>
              <span className="tst-row__price">{c.price}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="tst-guide__block">
        <h3 className="tst-guide__eyebrow">
          <SparkSmall /> Dicas avançadas
        </h3>
        <ul className="tst-guide__rows">
          {tips.map((t) => (
            <li key={t.title} className="tst-row">
              <span className="tst-row__icon">{t.icon}</span>
              <div className="tst-row__text">
                <p className="tst-row__title">{t.title}</p>
                <p className="tst-row__body">{t.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="tst-guide__note">
        <CheckIcon /> A IA Tipster é uma ferramenta de orientação baseada em
        dados estatísticos. Use como apoio à sua análise — nenhuma análise é
        garantia de resultado. Jogue com responsabilidade.
      </p>
    </div>
  );
}

/* ---- inline icons ---- */
function SparkSmall() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4" />
    </svg>
  );
}
function CoinsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function RadioIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}
function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
function CalendarIcon() {
  return (
    <Svg>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  );
}
function PackageIcon() {
  return (
    <Svg>
      <path d="M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </Svg>
  );
}
function InfinityIcon() {
  return (
    <Svg>
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
    </Svg>
  );
}
function ThumbsUpIcon() {
  return (
    <Svg>
      <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </Svg>
  );
}
function RefreshIcon() {
  return (
    <Svg>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </Svg>
  );
}
function ExternalLinkIcon() {
  return (
    <Svg>
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Svg>
  );
}
function CheckIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}
