import { throwHTTPException503ServiceUnavailable } from '@sirena/backend-utils/helpers';
import jwt from 'jsonwebtoken';
import { envVars } from '../../config/env.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';

const METABASE_TOKEN_EXPIRATION_SECONDS = 10 * 60;
const METABASE_FETCH_TIMEOUT_MS = 30_000;
const METABASE_ERROR_BODY_PREVIEW = 500;

type MetabaseConfig = {
  siteUrl: string;
  secretKey: string;
};

type MetabaseDashboardConfig = MetabaseConfig & {
  dashboardId: number;
};

export type DashboardCardData = {
  id: number;
  dashcardId: number;
  name: string;
  data: Array<Record<string, unknown>>;
};

const ensureMetabaseConfigured = (): MetabaseConfig => {
  const logger = getLoggerStore();
  const { METABASE_SITE_URL: siteUrl, METABASE_SECRET_KEY: secretKey } = envVars;
  const missing: string[] = [];
  if (!siteUrl) missing.push('METABASE_SITE_URL');
  if (!secretKey) missing.push('METABASE_SECRET_KEY');
  if (missing.length > 0) {
    logger.error({ missing }, '[statistics] Metabase configuration missing');
    throwHTTPException503ServiceUnavailable('Metabase is not configured');
  }
  return { siteUrl, secretKey };
};

const ensureMetabaseDashboardConfigured = (): MetabaseDashboardConfig => {
  const logger = getLoggerStore();
  const base = ensureMetabaseConfigured();
  const rawId = envVars.METABASE_DASHBOARD_ID;
  const dashboardId = Number.parseInt(rawId, 10);
  if (!rawId || Number.isNaN(dashboardId) || dashboardId <= 0) {
    logger.error({ rawId }, '[statistics] METABASE_DASHBOARD_ID is missing or invalid');
    throwHTTPException503ServiceUnavailable('Metabase dashboard id is not configured');
  }
  return { ...base, dashboardId };
};

type MetabaseResource = { question: number } | { dashboard: number };

const signMetabaseToken = (
  resource: MetabaseResource,
  secretKey: string,
  params: Record<string, unknown> = {},
): string =>
  jwt.sign(
    {
      resource,
      params,
      exp: Math.round(Date.now() / 1000) + METABASE_TOKEN_EXPIRATION_SECONDS,
    },
    secretKey,
  );

export const signMetabaseCardToken = (cardId: number, secretKey: string): string =>
  signMetabaseToken({ question: cardId }, secretKey);

export const signMetabaseDashboardToken = (
  dashboardId: number,
  secretKey: string,
  params: Record<string, unknown> = {},
): string => signMetabaseToken({ dashboard: dashboardId }, secretKey, params);

const safeReadErrorBody = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    return text.length > METABASE_ERROR_BODY_PREVIEW ? `${text.slice(0, METABASE_ERROR_BODY_PREVIEW)}…` : text;
  } catch {
    return '<unreadable body>';
  }
};

const fetchJson = async (url: string, logContext: Record<string, unknown>): Promise<unknown> => {
  const logger = getLoggerStore();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), METABASE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await safeReadErrorBody(response);
      logger.warn(
        { ...logContext, status: response.status, statusText: response.statusText, body },
        '[statistics] Metabase fetch returned non-2xx',
      );
      throwHTTPException503ServiceUnavailable('Metabase service is currently unavailable. Please try again later.');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error({ ...logContext, timeoutMs: METABASE_FETCH_TIMEOUT_MS }, '[statistics] Metabase request timed out');
      throwHTTPException503ServiceUnavailable('Metabase request timed out. Please try again later.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchCardData = async (cardId: number): Promise<Array<Record<string, unknown>>> => {
  const logger = getLoggerStore();
  const { siteUrl, secretKey } = ensureMetabaseConfigured();

  const token = signMetabaseCardToken(cardId, secretKey);
  const url = `${siteUrl.replace(/\/$/, '')}/api/embed/card/${token}/query/json`;

  const data = await fetchJson(url, { cardId });

  if (!Array.isArray(data)) {
    logger.warn({ cardId, payloadType: typeof data }, '[statistics] Metabase card response is not an array');
    throwHTTPException503ServiceUnavailable('Unexpected response from Metabase service.');
  }

  return data as Array<Record<string, unknown>>;
};

type RawDashcard = {
  id?: unknown;
  card_id?: unknown;
  card?: { id?: unknown; name?: unknown } | null;
};

type RawDashboardPayload = {
  dashcards?: RawDashcard[];
  ordered_cards?: RawDashcard[];
};

type DashcardDescriptor = {
  dashcardId: number;
  cardId: number;
  name: string;
};

const extractDashcards = (payload: unknown): RawDashcard[] => {
  if (!payload || typeof payload !== 'object') return [];
  const { dashcards, ordered_cards } = payload as RawDashboardPayload;
  if (Array.isArray(dashcards)) return dashcards;
  if (Array.isArray(ordered_cards)) return ordered_cards;
  return [];
};

const toDashcardDescriptor = (raw: RawDashcard): DashcardDescriptor | null => {
  const cardId = typeof raw.card?.id === 'number' ? raw.card.id : typeof raw.card_id === 'number' ? raw.card_id : null;
  const dashcardId = typeof raw.id === 'number' ? raw.id : null;
  if (cardId == null || dashcardId == null) return null;
  const name = typeof raw.card?.name === 'string' ? raw.card.name : `Carte ${cardId}`;
  return { dashcardId, cardId, name };
};

export const fetchDashboardCardsData = async (params: Record<string, unknown> = {}): Promise<DashboardCardData[]> => {
  const logger = getLoggerStore();
  const { siteUrl, secretKey, dashboardId } = ensureMetabaseDashboardConfigured();

  const token = signMetabaseDashboardToken(dashboardId, secretKey, params);
  const base = siteUrl.replace(/\/$/, '');

  const metadata = await fetchJson(`${base}/api/embed/dashboard/${token}`, { dashboardId, step: 'metadata' });

  const rawDashcards = extractDashcards(metadata);
  const dashcards = rawDashcards.map(toDashcardDescriptor).filter((d): d is DashcardDescriptor => d !== null);

  if (dashcards.length === 0) {
    logger.warn({ dashboardId }, '[statistics] Metabase dashboard has no readable cards');
    return [];
  }

  return Promise.all(
    dashcards.map(async ({ dashcardId, cardId, name }) => {
      const cardUrl = `${base}/api/embed/dashboard/${token}/dashcard/${dashcardId}/card/${cardId}/json`;
      const data = await fetchJson(cardUrl, { dashboardId, dashcardId, cardId, step: 'card-data' });

      if (!Array.isArray(data)) {
        logger.warn(
          { dashboardId, dashcardId, cardId, payloadType: typeof data },
          '[statistics] dashcard data is not an array, returning empty',
        );
        return { id: cardId, dashcardId, name, data: [] };
      }

      return { id: cardId, dashcardId, name, data: data as Array<Record<string, unknown>> };
    }),
  );
};
