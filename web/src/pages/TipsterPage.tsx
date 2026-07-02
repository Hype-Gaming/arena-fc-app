// web/src/pages/TipsterPage.tsx — IA Tipster screen: header, tabs, chat
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ApiClient } from '../lib/apiClient';
import { TipsterChat } from '../features/tipster/TipsterChat';
import '../features/tipster/TipsterScreen.css';

type Tab = 'chat' | 'aovivo' | 'tutorial';

interface MeProfile {
  creditBalance: number;
}

export function TipsterPage({ api }: { api: ApiClient }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('chat');
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<MeProfile>('/me')
      .then((me) => setCredits(me.creditBalance))
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
        {credits !== null && (
          <span className="tst-head__credits">
            <CoinsIcon /> {credits} {credits === 1 ? 'crédito' : 'créditos'}
          </span>
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
          onBuyCredits={() => navigate('/planos')}
          onBalance={(b) => setCredits(b)}
        />
      )}
      {tab === 'aovivo' && (
        <div className="tst-placeholder">
          <RadioIcon />
          <p>Nenhuma partida ao vivo agora.</p>
          <span>As análises ao vivo aparecem aqui durante os jogos.</span>
        </div>
      )}
      {tab === 'tutorial' && (
        <div className="tst-placeholder">
          <BookIcon />
          <p>Como usar o IA Tipster</p>
          <span>
            Digite o nome de dois times (ex.: São Paulo x Palmeiras), confirme o
            jogo encontrado e receba a análise. Cada análise consome 1 crédito.
          </span>
        </div>
      )}
    </section>
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
