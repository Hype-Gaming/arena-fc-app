import { useEffect, useMemo, useState } from 'react';
import { fetchLatestTutorial, type Tutorial } from '../api/tutorialApi';

const SEEN_KEY = 'tutorialSeenVersion';

/**
 * First-access onboarding: a short set of pop-up steps explaining the app,
 * shown once per tutorial version (tracked in localStorage). A buyer returning
 * from checkout sees this on their first login.
 */
export function TutorialOverlay() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchLatestTutorial()
      .then((latest) => {
        if (!active || latest.steps.length === 0) return;
        setTutorial(latest);
        if (localStorage.getItem(SEEN_KEY) !== String(latest.version)) {
          setOpen(true);
        }
      })
      .catch(() => {
        /* tutorial is best-effort; never block the app on it */
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleStep = tutorial?.steps[stepIndex];
  const isLastStep = tutorial ? stepIndex >= tutorial.steps.length - 1 : true;

  const progressLabel = useMemo(() => {
    if (!tutorial) return '';
    return `${Math.min(stepIndex + 1, tutorial.steps.length)} de ${
      tutorial.steps.length
    }`;
  }, [stepIndex, tutorial]);

  if (!open || !tutorial || !visibleStep) return null;

  function markSeen() {
    localStorage.setItem(SEEN_KEY, String(tutorial!.version));
    setOpen(false);
  }

  function advance() {
    if (!isLastStep) {
      setStepIndex((i) => i + 1);
      return;
    }
    markSeen();
  }

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      <section className="tutorial-card" data-phase="intro">
        <button
          type="button"
          className="tutorial-card__close"
          aria-label="Fechar tutorial"
          onClick={markSeen}
        >
          <CloseIcon />
        </button>

        <div className="tutorial-card__brand" aria-hidden="true">
          <img src="/logo-simplificada.png" alt="" />
        </div>

        <div className="tutorial-card__kicker">{progressLabel}</div>
        <h3>{visibleStep.title}</h3>
        <p>{visibleStep.body}</p>
        <div className="tutorial-card__steps" aria-hidden="true">
          {tutorial.steps.map((step, i) => (
            <span
              key={`${step.title}-${i}`}
              className={
                i === stepIndex
                  ? 'tutorial-card__dot tutorial-card__dot--active'
                  : 'tutorial-card__dot'
              }
            />
          ))}
        </div>
        {visibleStep.imageUrl && (
          <img
            className="tutorial-card__image"
            src={visibleStep.imageUrl}
            alt=""
          />
        )}
        <button
          type="button"
          className="tutorial-card__primary"
          onClick={advance}
        >
          {isLastStep ? 'Começar' : 'Continuar'}
        </button>
      </section>
    </div>
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
