// web/src/lib/apiClient.ts
import { tokenStorage } from './tokenStorage';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchFn = typeof fetch;

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = fetch.bind(globalThis),
  ) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<T> {
    const access = tokenStorage.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (access) headers.Authorization = `Bearer ${access}`;

    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 401 && !isRetry && tokenStorage.getRefreshToken()) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(method, path, body, true);
    }

    if (!res.ok) {
      const msg = await this.readMessage(res);
      throw new ApiError(res.status, msg);
    }

    return (await res.json()) as T;
  }

  private async tryRefresh(): Promise<boolean> {
    const refreshToken = tokenStorage.getRefreshToken();
    const res = await this.fetchFn(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      tokenStorage.clear();
      return false;
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    tokenStorage.setTokens(data);
    return true;
  }

  private async readMessage(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { message?: string };
      return data.message ?? res.statusText;
    } catch {
      return res.statusText;
    }
  }
}

export const api = new ApiClient(
  (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
);
