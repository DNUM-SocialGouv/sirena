import { redactSecrets } from './secrets.js';
import { UserError } from './user-error.js';

const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

const POST_RETRYABLE_STATUSES = new Set([429]);
const MAX_ATTEMPTS = 3;
const ERROR_BODY_PREVIEW = 800;
const BASE_BACKOFF_MS = 500;
const MAX_RETRY_AFTER_MS = 30_000;

export type MetabaseClient = {
  baseUrl: string;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;

  put<T>(path: string, body: unknown): Promise<T | undefined>;
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

export function isEntityId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function entityPath(kind: 'card' | 'dashboard' | 'collection', id: unknown): string {
  if (!isEntityId(id)) {
    throw new UserError(`Refusing to call the Metabase API with an invalid ${kind} id: ${JSON.stringify(id)}`);
  }
  return `/api/${kind}/${id}`;
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

const backoffMs = (attempt: number): number => Math.random() * BASE_BACKOFF_MS * attempt;

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.min(ms, MAX_RETRY_AFTER_MS);
}

function normalizeSiteUrl(siteUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(siteUrl);
  } catch {
    throw new UserError(`Invalid Metabase URL "${siteUrl}" — expected something like https://metabase.example.com`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new UserError(`Invalid Metabase URL "${siteUrl}": only http(s) is supported, got "${parsed.protocol}"`);
  }
  if (parsed.username || parsed.password) {
    throw new UserError(
      'Refusing a Metabase URL carrying credentials (https://user:password@host): the URL is printed and written ' +
        'to the report. Pass the API key with --api-key-env, --api-key-file or --api-key-stdin.',
    );
  }
  return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
}

export function createMetabaseClient({ siteUrl, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS }: MetabaseClientOptions) {
  const baseUrl = normalizeSiteUrl(siteUrl);

  const request = async <T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T | undefined> => {
    const retryableStatuses = method === 'POST' ? POST_RETRYABLE_STATUSES : RETRYABLE_STATUSES;
    const retryOnNetworkError = method !== 'POST';
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

          redirect: 'error',
        });
      } catch (error) {
        lastError = error;
        if (!retryOnNetworkError || attempt === MAX_ATTEMPTS) break;
        await sleep(backoffMs(attempt));
        continue;
      }

      if (res.ok) {
        if (res.status === 204) return undefined;
        return (await res.json()) as T;
      }

      const raw = await res.text().catch(() => '<unreadable body>');
      const text = redactSecrets(raw);
      const preview = text.length > ERROR_BODY_PREVIEW ? `${text.slice(0, ERROR_BODY_PREVIEW)}…` : text;
      lastError = new MetabaseApiError(method, path, res.status, preview);
      if (!retryableStatuses.has(res.status) || attempt === MAX_ATTEMPTS) break;
      await sleep(retryAfterMs(res) ?? backoffMs(attempt));
    }

    throw lastError instanceof Error ? lastError : new Error(`${method} ${path} failed: ${String(lastError)}`);
  };

  const client: MetabaseClient = {
    baseUrl,

    get: <T>(path: string) => request<T>('GET', path) as Promise<T>,
    post: <T>(path: string, body: unknown) => request<T>('POST', path, body) as Promise<T>,
    put: (path, body) => request('PUT', path, body),
  };
  return client;
}
