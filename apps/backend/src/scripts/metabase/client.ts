const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const ERROR_BODY_PREVIEW = 800;

export type MetabaseClient = {
  baseUrl: string;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
};

export type MetabaseClientOptions = {
  siteUrl: string;
  apiKey: string;
  timeoutMs?: number;
};

export class MetabaseApiError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(`${method} ${path} → ${status}: ${body}`);
    this.name = 'MetabaseApiError';
  }
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

export function createMetabaseClient({ siteUrl, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS }: MetabaseClientOptions) {
  const baseUrl = siteUrl.replace(/\/+$/, '');

  const request = async <T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const headers: Record<string, string> = { 'X-API-Key': apiKey, Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      let res: Response;
      try {
        res = await fetch(`${baseUrl}${path}`, {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (error) {
        lastError = error;
        if (attempt === MAX_ATTEMPTS) break;
        await sleep(attempt * 500);
        continue;
      }

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      }

      const text = await res.text().catch(() => '<unreadable body>');
      const preview = text.length > ERROR_BODY_PREVIEW ? `${text.slice(0, ERROR_BODY_PREVIEW)}…` : text;
      lastError = new MetabaseApiError(method, path, res.status, preview);
      if (!RETRYABLE_STATUSES.has(res.status) || attempt === MAX_ATTEMPTS) break;
      await sleep(attempt * 500);
    }

    throw lastError instanceof Error ? lastError : new Error(`${method} ${path} failed: ${String(lastError)}`);
  };

  const client: MetabaseClient = {
    baseUrl,
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
  };
  return client;
}
