// web/src/shell/FreeOddCta.tsx — top-of-screen "Resgatar Odd Grátis" CTA shown
// only to free users. Opens a popup that funnels them to the Telegram group.
import { useEffect, useState } from 'react';
import { api as defaultApi, type ApiClient } from '../lib/apiClient';
import './FreeOddCta.css';

const TELEGRAM_URL =
  (import.meta.env.VITE_TELEGRAM_URL as string | undefined) ??
  'https://t.me/+arena_fc';

interface MeProfile {
  planKey: string;
}

export function FreeOddCta({ api = defaultApi }: { api?: Pick<ApiClient, 'get'> }) {
  const [isFree, setIsFree] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<MeProfile>('/me')
      .then((me) => {
        if (active) setIsFree(me.planKey === 'free');
      })
      .catch(() => {
        /* if we can't tell the plan, we simply don't nag with the CTA */
      });
    return () => {
      active = false;
    };
  }, [api]);

  if (!isFree) return null;

  return (
    <>
      <div className="free-odd">
        <button
          type="button"
          className="free-odd__btn"
          onClick={() => setOpen(true)}
        >
          <PaperPlane /> Resgatar Odd Grátis
        </button>
      </div>

      {open && (
        <div
          className="free-odd__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="free-odd-title"
          onClick={() => setOpen(false)}
        >
          <div className="free-odd__card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="free-odd__close"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
            <h3 id="free-odd-title" className="free-odd__title">
              Resgate sua odd grátis hoje
            </h3>
            <p className="free-odd__body">
              Clique no botão abaixo e garanta o acesso às melhores odds do dia
              direto no nosso grupo do Telegram
            </p>
            <button
              type="button"
              className="free-odd__cta"
              onClick={() => window.open(TELEGRAM_URL, '_blank')}
            >
              <PaperPlane /> Resgatar Odd Grátis
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function PaperPlane() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20.7 4.2 3.8 10.7c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.2c.2.6.3.8.7.8.3 0 .5-.1.8-.4l2.1-2 4.4 3.2c.8.5 1.4.3 1.6-.8l2.9-13.6c.3-1.2-.4-1.8-1.4-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
