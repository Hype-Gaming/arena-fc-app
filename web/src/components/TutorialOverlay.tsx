import { useEffect, useState } from 'react';
import { fetchLatestTutorial, type Tutorial } from '../api/tutorialApi';

export function TutorialOverlay() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLatestTutorial().then((t) => {
      const seen = localStorage.getItem('tutorialSeenVersion');
      if (seen !== String(t.version)) {
        setTutorial(t);
        setOpen(true);
      }
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
