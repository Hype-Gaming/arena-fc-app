// web/src/screens/ExplainerModal.tsx — reusable "understand this product" popup
// (Múltiplas, Odds Altas, Alavancagem, …). Opened from a category chip; the CTA
// leads to plans. Some products (Alavancagem) show a worked example as a row of
// steps under the body.
import { Fragment } from 'react';
import './ExplainerModal.css';

/** One stage of a worked example (e.g. an Alavancagem reinvestment step). */
export interface ExplainerStep {
  label: string;
  aposta: string;
  odd: string;
  ganha: string;
}

export interface Explainer {
  title: string;
  imageSrc: string;
  imageAlt: string;
  body: string;
  /** Optional worked-example stepper shown between the body and the CTA. */
  steps?: ExplainerStep[];
  /** Small caption under the stepper. */
  footnote?: string;
}

export function ExplainerModal({
  explainer,
  onClose,
  onInterest,
}: {
  /** The content to show; null closes the modal. */
  explainer: Explainer | null;
  onClose: () => void;
  onInterest: () => void;
}) {
  if (!explainer) return null;

  return (
    <div
      className="exp__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exp-title"
      onClick={onClose}
    >
      <div className="exp__card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="exp__close"
          aria-label="Fechar"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <h3 id="exp-title" className="exp__title">
          {explainer.title}
        </h3>

        <img
          className="exp__art"
          src={explainer.imageSrc}
          alt={explainer.imageAlt}
        />

        <p className="exp__body">{explainer.body}</p>

        {explainer.steps && explainer.steps.length > 0 && (
          <div className="exp__steps">
            {explainer.steps.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 && (
                  <span className="exp__step-arrow" aria-hidden="true">
                    <Arrow />
                  </span>
                )}
                <div className="exp__step">
                  <span className="exp__step-label">{s.label}</span>
                  <span className="exp__step-aposta">{s.aposta}</span>
                  <span className="exp__step-odd">{s.odd}</span>
                  <span className="exp__step-ganha">{s.ganha}</span>
                </div>
              </Fragment>
            ))}
          </div>
        )}

        {explainer.footnote && <p className="exp__foot">{explainer.footnote}</p>}

        <button type="button" className="exp__cta" onClick={onInterest}>
          Entendi, tenho interesse <Arrow />
        </button>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
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
