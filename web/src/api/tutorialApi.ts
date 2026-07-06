export interface TutorialStep {
  title: string;
  body: string;
  imageUrl?: string;
}
export interface Tutorial {
  version: number;
  steps: TutorialStep[];
}
export interface TelegramUnlockStatus {
  startedAt: string | null;
  claimAt: string | null;
  unlockedAt: string | null;
  remainingSeconds: number;
  eligible: boolean;
  planKey: 'diamante';
}

export async function fetchLatestTutorial(): Promise<Tutorial> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/tutorial/latest', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function fetchTelegramUnlockStatus(): Promise<TelegramUnlockStatus> {
  return requestTelegramUnlock('GET', '/api/me/telegram-unlock');
}

export async function startTelegramUnlock(): Promise<TelegramUnlockStatus> {
  return requestTelegramUnlock('POST', '/api/me/telegram-unlock/start');
}

export async function claimTelegramUnlock(): Promise<TelegramUnlockStatus> {
  return requestTelegramUnlock('POST', '/api/me/telegram-unlock/claim');
}

async function requestTelegramUnlock(
  method: 'GET' | 'POST',
  path: string,
): Promise<TelegramUnlockStatus> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
