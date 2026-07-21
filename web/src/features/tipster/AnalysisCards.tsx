// web/src/features/tipster/AnalysisCards.tsx
// Renders an IA Tipster analysis as the 4 collapsible cards (ENTRADA PRINCIPAL /
// ALTERNATIVAS / RESUMO / CONTEXTO). Falls back to plain text if the message
// isn't in the expected format.
import { useState } from 'react';
import { parseAnalysis, type AnalysisSection } from './analysis-format';

interface Props {
  message: string;
  /** Sportsbook deep link for the "Pegue o bilhete" CTA. */
  deepLink?: string;
  /** Resets the chat to search another game. */
  onAskAnother?: () => void;
}

export function AnalysisCards({ message, deepLink, onAskAnother }: Props) {
  const sections = parseAnalysis(message);
  if (!sections) {
    return <p className="tst-line tst-line--assistant">{message}</p>;
  }

  return (
    <div className="ac">
      {sections.map((s) => (
        <AnalysisCard key={s.key} section={s} defaultOpen={s.key === 'principal'} />
      ))}

      <p className="ac__valid">Análise válida até o início do jogo</p>

      <Feedback />

      {deepLink && (
        <a
          className="ac__cta"
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <TicketIcon /> PEGUE O BILHETE
        </a>
      )}
      {onAskAnother && (
        <button type="button" className="ac__another" onClick={onAskAnother}>
          <SearchIcon /> Pedir análise de outro jogo
        </button>
      )}
    </div>
  );
}

function AnalysisCard({
  section,
  defaultOpen,
}: {
  section: AnalysisSection;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = `ac-body-${section.key}`;
  const hasBody = section.paragraphs.length > 0 || section.bullets.length > 0;

  return (
    <section className="ac-card" data-tone={section.key}>
      <button
        type="button"
        className="ac-card__head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className="ac-card__label">
          <SectionIcon k={section.key} />
          {section.label.toUpperCase()}
        </span>
        {hasBody && <Chevron data-open={open ? 'true' : 'false'} />}
      </button>

      {section.headline && <p className="ac-card__headline">{section.headline}</p>}

      {hasBody && (
        <div id={bodyId} className="ac-card__body" data-open={open ? 'true' : 'false'}>
          {section.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {section.bullets.length > 0 && (
            <ul>
              {section.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Feedback() {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  return (
    <div className="ac__feedback">
      <button
        type="button"
        className="ac__fb"
        data-active={vote === 'up'}
        aria-label="Análise útil"
        onClick={() => setVote((v) => (v === 'up' ? null : 'up'))}
      >
        <ThumbIcon />
      </button>
      <button
        type="button"
        className="ac__fb"
        data-active={vote === 'down'}
        aria-label="Análise ruim"
        onClick={() => setVote((v) => (v === 'down' ? null : 'down'))}
      >
        <ThumbIcon down />
      </button>
    </div>
  );
}

/* ---- icons ---- */
function SectionIcon({ k }: { k: AnalysisSection['key'] }) {
  if (k === 'principal') return <TargetIcon />;
  if (k === 'alternativas') return <BoltIcon />;
  if (k === 'resumo') return <DocIcon />;
  return <SearchIcon />;
}

const svgProps = {
  width: 13,
  height: 13,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function TargetIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg {...svgProps}>
      <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10H12l1-8z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg {...svgProps}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6M8 13h8M8 17h6" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg {...svgProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function Chevron(props: { 'data-open': string }) {
  return (
    <svg className="ac-card__chev" {...svgProps} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </svg>
  );
}
function ThumbIcon({ down }: { down?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={down ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z" />
    </svg>
  );
}
