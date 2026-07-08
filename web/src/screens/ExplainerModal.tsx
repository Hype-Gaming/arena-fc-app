// web/src/screens/ExplainerModal.tsx — reusable "understand this product" popup
// (Múltiplas, Odds Altas, …). Opened from a category chip; the CTA leads to plans.
import './ExplainerModal.css';

export interface Explainer {
  title: string;
  imageSrc: string;
  imageAlt: string;
  body: string;
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
