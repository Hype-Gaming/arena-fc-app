export interface TutorialStep {
  title: string;
  body: string;
  imageUrl?: string;
}
export interface Tutorial {
  version: number;
  steps: TutorialStep[];
}

export async function fetchLatestTutorial(): Promise<Tutorial> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/tutorial/latest', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
