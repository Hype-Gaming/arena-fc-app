import { useEffect, useState } from 'react';
import { fetchLatestTutorial, type Tutorial } from '../api/tutorialApi';

export function TutorialOverlay() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // First-access only, and defensive: if the tutorial endpoint is
    // unreachable the app must still render, so swallow any failure.
    fetchLatestTutorial()
      .then((t) => {
        const seen = localStorage.getItem('tutorialSeenVersion');
        if (seen !== String(t.version)) {
          setTutorial(t);
          setOpen(true);
        }
      })
      .catch(() => {
        /* no tutorial available — skip the overlay */
      });
  }, []);

  if (!open || !tutorial) return null;

  const step = tutorial.steps[index];
  const isLast = index === tutorial.steps.length - 1;

  function dismiss() {
    localStorage.setItem('tutorialSeenVersion', String(tutorial!.version));
    setOpen(false);
  }

  return (
    <div className="tutorial-overlay" role="dialog">
      <h3>{step.title}</h3>
      <p>{step.body}</p>
      {isLast ? (
        <button onClick={dismiss}>Done</button>
      ) : (
        <button onClick={() => setIndex((i) => i + 1)}>Next</button>
      )}
    </div>
  );
}
