import { useEffect, useState } from 'react';
import { fetchLatestTutorial, type Tutorial } from '../api/tutorialApi';

export function TutorialPage() {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);

  useEffect(() => {
    fetchLatestTutorial().then(setTutorial);
  }, []);

  if (!tutorial) return <p>Carregando…</p>;

  return (
    <main className="tutorial-page">
      <h1>Tutorial</h1>
      <ol>
        {tutorial.steps.map((s, i) => (
          <li key={i}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
