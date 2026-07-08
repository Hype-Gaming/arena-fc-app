// web/src/screens/MultiplasModal.tsx — explainer popup for the "Odds Múltiplas"
// product. Opened from the Múltiplas market; the CTA leads to the plans screen.
import './MultiplasModal.css';

export function MultiplasModal({
  open,
  onClose,
  onInterest,
}: {
  open: boolean;
  onClose: () => void;
  onInterest: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="mult__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mult-title"
      onClick={onClose}
    >
      <div className="mult__card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="mult__close"
          aria-label="Fechar"
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        <h3 id="mult-title" className="mult__title">
          Entenda como funciona as Múltiplas
        </h3>

        <img
          className="mult__art"
          src="/odds-multiplas.png"
          alt="Odds Múltiplas — Arena FC"
        />

        <p className="mult__body">
          Odds combinadas de múltiplos eventos com retorno entre 10x e 200x.
          Aposta de baixa entrada e potencial alto de multiplicação.
        </p>

        <button type="button" className="mult__cta" onClick={onInterest}>
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
