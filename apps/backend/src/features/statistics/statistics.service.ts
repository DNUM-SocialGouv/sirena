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

// 'local' = dashboard entité-scopé des admins locaux/agents ; 'national' = dashboard national du super
// admin (et, plus tard, du pilotage national). Mêmes clés Metabase, seul l'identifiant change.
export type DashboardScope = 'local' | 'national';

const DASHBOARD_ID_ENV: Record<DashboardScope, 'METABASE_DASHBOARD_ID' | 'METABASE_DASHBOARD_ID_ADMIN'> = {
  local: 'METABASE_DASHBOARD_ID',
  national: 'METABASE_DASHBOARD_ID_ADMIN',
};

// Slugs des filtres câblés dans Sirena : le contrôleur les utilise comme clés des paramètres optionnels
// et le front décide à partir d'eux quels filtres proposer. Ils sont fixés côté Metabase, donc un
// renommage là-bas ferait disparaître le filtre sans erreur : d'où le warn sur les slugs inconnus.
export const KNOWN_DASHBOARD_FILTER_SLUGS = [
  'start_date',
  'end_date',
  'domaine_fonctionnel',
  'lieu_de_survenue',
  'inclure_eig',
] as const;

export type DashboardFilterSlug = (typeof KNOWN_DASHBOARD_FILTER_SLUGS)[number];

const KNOWN_DASHBOARD_FILTER_SLUG_SET: ReadonlySet<string> = new Set(KNOWN_DASHBOARD_FILTER_SLUGS);

export type CardLayout = {
  col: number;
  row: number;
  sizeX: number;
  sizeY: number;
};

export type MetabaseColumn = {
  name: string;
  display_name: string;
  base_type: string;
  semantic_type: string | null;
  source: string | null;
};

export type CardData = {
  cols: MetabaseColumn[];
  rows: unknown[][];
};

export type DashboardCardData = {
  id: number;
  dashcardId: number;
  tabId: number | null;
  filterSlugs: string[];
  name: string;
  description: string | null;
  display: string | null;
  layout: CardLayout | null;
  data: CardData;
};

export type DashboardTab = {
  id: number;
  name: string;
  position: number;
};

export type DashboardData = {
  tabs: DashboardTab[];
  cards: DashboardCardData[];
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

const ensureMetabaseDashboardConfigured = (scope: DashboardScope = 'local'): MetabaseDashboardConfig => {
  const logger = getLoggerStore();
  const base = ensureMetabaseConfigured();
  const envKey = DASHBOARD_ID_ENV[scope];
  const rawId = envVars[envKey];
  const dashboardId = Number.parseInt(rawId, 10);
  if (!rawId || Number.isNaN(dashboardId) || dashboardId <= 0) {
    logger.error({ rawId, envKey }, '[statistics] Metabase dashboard id is missing or invalid');
    throwHTTPException503ServiceUnavailable('Metabase dashboard id is not configured');
  }
  return { ...base, dashboardId };
};

type MetabaseResource = { dashboard: number };

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
      // Sur 401/403, Metabase peut renvoyer le token signé dans le corps : on ne le loggue pas.
      const isAuthError = response.status === 401 || response.status === 403;
      const body = isAuthError ? '<redacted>' : await safeReadErrorBody(response);
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

type RawDashcard = {
  id?: unknown;
  card_id?: unknown;
  dashboard_tab_id?: unknown;
  parameter_mappings?: Array<{ parameter_id?: unknown }> | null;
  card?: {
    id?: unknown;
    name?: unknown;
    description?: unknown;
    display?: unknown;
    visualization_settings?: unknown;
  } | null;
  visualization_settings?: { visualization?: { display?: unknown } | null; column_settings?: unknown } | null;
  col?: unknown;
  row?: unknown;
  size_x?: unknown;
  size_y?: unknown;
};

type RawDashboardTab = { id?: unknown; name?: unknown; position?: unknown };

type RawDashboardPayload = {
  dashcards?: RawDashcard[];
  ordered_cards?: RawDashcard[];
  tabs?: RawDashboardTab[] | null;
  parameters?: RawDashboardParameter[] | null;
};

type RawDashboardParameter = { id?: unknown; slug?: unknown; name?: unknown };

type DashboardParameter = { id: string | null; slug: string };

const toDashboardParameter = (raw: RawDashboardParameter): DashboardParameter | null => {
  if (!raw || typeof raw !== 'object') return null;
  const slug = typeof raw.slug === 'string' ? raw.slug : typeof raw.name === 'string' ? raw.name : null;
  if (slug === null) return null;
  return { id: typeof raw.id === 'string' ? raw.id : null, slug };
};

const extractDashboardParameters = (payload: unknown): DashboardParameter[] => {
  if (!payload || typeof payload !== 'object') return [];
  const { parameters } = payload as RawDashboardPayload;
  if (!Array.isArray(parameters)) return [];
  return parameters.map(toDashboardParameter).filter((p): p is DashboardParameter => p !== null);
};

const extractFilterSlugs = (raw: RawDashcard, slugByParameterId: Map<string, string>): string[] => {
  if (!Array.isArray(raw.parameter_mappings)) return [];
  const slugs = raw.parameter_mappings
    .map((mapping) =>
      typeof mapping?.parameter_id === 'string' ? slugByParameterId.get(mapping.parameter_id) : undefined,
    )
    .filter((slug): slug is string => slug !== undefined);
  return [...new Set(slugs)].sort();
};

const toDashboardTab = (raw: RawDashboardTab, index: number): DashboardTab | null => {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'number') return null;
  const name = typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name.trim() : `Onglet ${index + 1}`;
  const position = typeof raw.position === 'number' ? raw.position : index;
  return { id: raw.id, name, position };
};

export const extractDashboardTabs = (payload: unknown): DashboardTab[] => {
  if (!payload || typeof payload !== 'object') return [];
  const { tabs } = payload as RawDashboardPayload;
  if (!Array.isArray(tabs)) return [];
  return tabs
    .map(toDashboardTab)
    .filter((tab): tab is DashboardTab => tab !== null)
    .sort((a, b) => a.position - b.position);
};

type DashcardDescriptor = {
  dashcardId: number;
  cardId: number;
  tabId: number | null;
  filterSlugs: string[];
  name: string;
  description: string | null;
  display: string | null;
  layout: CardLayout | null;
  columnTitles: Map<string, string>;
};

const extractDashcards = (payload: unknown): RawDashcard[] => {
  if (!payload || typeof payload !== 'object') return [];
  const { dashcards, ordered_cards } = payload as RawDashboardPayload;
  if (Array.isArray(dashcards)) return dashcards;
  if (Array.isArray(ordered_cards)) return ordered_cards;
  return [];
};

const extractDisplay = (raw: RawDashcard): string | null => {
  const override = raw.visualization_settings?.visualization?.display;
  if (typeof override === 'string') return override;
  return typeof raw.card?.display === 'string' ? raw.card.display : null;
};

// Position de la dashcard sur la grille Metabase (24 colonnes). Null si une coordonnée manque,
// pour retomber proprement sur un affichage pleine largeur côté front.
const extractLayout = (raw: RawDashcard): CardLayout | null => {
  const { col, row, size_x: sizeX, size_y: sizeY } = raw;
  if (typeof col !== 'number' || typeof row !== 'number' || typeof sizeX !== 'number' || typeof sizeY !== 'number') {
    return null;
  }
  return { col, row, sizeX, sizeY };
};

const parseColumnSettingKey = (rawKey: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(rawKey);
    if (!Array.isArray(parsed)) return null;
    const [kind, value] = parsed;
    if (kind === 'name' && typeof value === 'string') return value;
    if (kind === 'ref' && Array.isArray(value)) {
      const [refType, fieldName] = value;
      if (refType === 'field' && typeof fieldName === 'string') return fieldName;
    }
    return null;
  } catch {
    return null;
  }
};

const readColumnTitles = (settings: unknown, titles: Map<string, string>): void => {
  if (!settings || typeof settings !== 'object') return;
  const { column_settings: columnSettings } = settings as { column_settings?: unknown };
  if (!columnSettings || typeof columnSettings !== 'object') return;
  for (const [rawKey, rawValue] of Object.entries(columnSettings)) {
    const columnName = parseColumnSettingKey(rawKey);
    if (!columnName) continue;
    const rawTitle = (rawValue as { column_title?: unknown })?.column_title;
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    if (title !== '') titles.set(columnName, title);
  }
};

const extractColumnTitles = (raw: RawDashcard): Map<string, string> => {
  const titles = new Map<string, string>();
  readColumnTitles(raw.card?.visualization_settings, titles);
  readColumnTitles(raw.visualization_settings, titles);
  return titles;
};

const toDashcardDescriptor = (raw: RawDashcard, slugByParameterId: Map<string, string>): DashcardDescriptor | null => {
  const cardId = typeof raw.card?.id === 'number' ? raw.card.id : typeof raw.card_id === 'number' ? raw.card_id : null;
  const dashcardId = typeof raw.id === 'number' ? raw.id : null;
  if (cardId == null || dashcardId == null) return null;
  const tabId = typeof raw.dashboard_tab_id === 'number' ? raw.dashboard_tab_id : null;
  const filterSlugs = extractFilterSlugs(raw, slugByParameterId);
  const name = typeof raw.card?.name === 'string' ? raw.card.name : `Carte ${cardId}`;
  const rawDescription = raw.card?.description;
  const trimmedDescription = typeof rawDescription === 'string' ? rawDescription.trim() : '';
  const description = trimmedDescription === '' ? null : trimmedDescription;
  const display = extractDisplay(raw);
  const layout = extractLayout(raw);
  const columnTitles = extractColumnTitles(raw);
  return { dashcardId, cardId, tabId, filterSlugs, name, description, display, layout, columnTitles };
};

type RawMetabaseColumn = {
  name?: unknown;
  display_name?: unknown;
  base_type?: unknown;
  semantic_type?: unknown;
  source?: unknown;
};

const EMPTY_CARD_DATA: CardData = { cols: [], rows: [] };

const toMetabaseColumn = (raw: RawMetabaseColumn): MetabaseColumn | null => {
  if (!raw || typeof raw !== 'object') return null;
  const { name, display_name: displayName, base_type: baseType, semantic_type: semanticType, source } = raw;
  if (typeof name !== 'string') return null;
  return {
    name,
    display_name: typeof displayName === 'string' ? displayName : name,
    base_type: typeof baseType === 'string' ? baseType : 'type/*',
    semantic_type: typeof semanticType === 'string' ? semanticType : null,
    source: typeof source === 'string' ? source : null,
  };
};

const extractCardData = (payload: unknown): CardData => {
  if (!payload || typeof payload !== 'object') return EMPTY_CARD_DATA;
  const { data } = payload as { data?: unknown };
  if (!data || typeof data !== 'object') return EMPTY_CARD_DATA;
  const { cols, rows } = data as { cols?: unknown; rows?: unknown };
  if (!Array.isArray(cols) || !Array.isArray(rows)) return EMPTY_CARD_DATA;
  return {
    cols: cols.map(toMetabaseColumn).filter((col): col is MetabaseColumn => col !== null),
    rows: rows.filter((row): row is unknown[] => Array.isArray(row)),
  };
};

const applyColumnTitles = (data: CardData, titles: Map<string, string>): CardData => {
  if (titles.size === 0) return data;
  return {
    ...data,
    cols: data.cols.map((col) => {
      const title = titles.get(col.name);
      return title ? { ...col, display_name: title } : col;
    }),
  };
};

export const fetchDashboardData = async (
  lockedParams: Record<string, unknown> = {},
  optionalParams: Record<string, unknown> = {},
  scope: DashboardScope = 'local',
): Promise<DashboardData> => {
  const logger = getLoggerStore();
  const { siteUrl, secretKey, dashboardId } = ensureMetabaseDashboardConfigured(scope);

  const base = siteUrl.replace(/\/$/, '');

  const token = signMetabaseDashboardToken(dashboardId, secretKey, lockedParams);
  const metadata = await fetchJson(`${base}/api/embed/dashboard/${token}`, { dashboardId, step: 'metadata' });

  const parameters = extractDashboardParameters(metadata);
  const declaredSlugs = new Set(parameters.map((p) => p.slug));

  const unknownSlugs = [...declaredSlugs].filter((slug) => !KNOWN_DASHBOARD_FILTER_SLUG_SET.has(slug));
  if (unknownSlugs.length > 0) {
    logger.warn(
      { dashboardId, unknownSlugs, knownSlugs: [...KNOWN_DASHBOARD_FILTER_SLUGS] },
      '[statistics] Metabase dashboard declares filters unknown to Sirena, they are neither offered nor applied',
    );
  }

  const slugByParameterId = new Map(
    parameters.flatMap((p): Array<[string, string]> => (p.id === null ? [] : [[p.id, p.slug]])),
  );
  const appliedOptional = Object.entries(optionalParams).filter(
    ([slug, value]) => value != null && declaredSlugs.has(slug) && (!Array.isArray(value) || value.length > 0),
  );

  const filterSearch = new URLSearchParams();
  for (const [slug, value] of appliedOptional) {
    if (Array.isArray(value)) {
      for (const item of value) {
        filterSearch.append(slug, String(item));
      }
      continue;
    }
    filterSearch.set(slug, String(value));
  }
  const filterQuery = filterSearch.toString();
  const filterSuffix = filterQuery ? `?${filterQuery}` : '';

  const tabs = extractDashboardTabs(metadata);
  const rawDashcards = extractDashcards(metadata);
  const dashcards = rawDashcards
    .map((raw) => toDashcardDescriptor(raw, slugByParameterId))
    .filter((d): d is DashcardDescriptor => d !== null);

  if (dashcards.length === 0) {
    logger.warn({ dashboardId }, '[statistics] Metabase dashboard has no readable cards');
    return { tabs, cards: [] };
  }

  // allSettled (et non all) : une dashcard en échec ne doit pas rendre tout le dashboard
  // inaccessible. La carte fautive est renvoyée avec des données vides et le reste s'affiche.
  const settled = await Promise.allSettled(
    dashcards.map(
      async ({ dashcardId, cardId, tabId, filterSlugs, name, description, display, layout, columnTitles }) => {
        const cardUrl = `${base}/api/embed/dashboard/${token}/dashcard/${dashcardId}/card/${cardId}${filterSuffix}`;
        const payload = await fetchJson(cardUrl, { dashboardId, dashcardId, cardId, step: 'card-data' });
        const data = applyColumnTitles(extractCardData(payload), columnTitles);

        if (data.cols.length === 0) {
          logger.warn(
            { dashboardId, dashcardId, cardId, payloadType: typeof payload },
            '[statistics] dashcard has no readable columns, returning empty',
          );
        }

        return { id: cardId, dashcardId, tabId, filterSlugs, name, description, display, layout, data };
      },
    ),
  );

  const cards = settled.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;

    const { dashcardId, cardId, tabId, filterSlugs, name, description, display, layout } = dashcards[index];
    logger.warn(
      {
        dashboardId,
        dashcardId,
        cardId,
        reason: result.reason instanceof Error ? result.reason.message : result.reason,
      },
      '[statistics] dashcard fetch failed, returning empty data',
    );
    return { id: cardId, dashcardId, tabId, filterSlugs, name, description, display, layout, data: EMPTY_CARD_DATA };
  });

  return { tabs, cards };
};
