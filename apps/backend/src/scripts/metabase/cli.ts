import { readFile } from 'node:fs/promises';
import { type ParseArgsConfig, parseArgs } from 'node:util';
import { isEntityId } from './client.js';
import { assertNoInlineSecret } from './credentials.js';
import { isObject } from './snapshot.js';
import { UserError } from './user-error.js';

export const DEFAULT_TIMEOUT_MS = 30_000;

export type Options = {
  source: number;
  target: number;
  url: string;

  urlFromEnv: boolean;
  apiKeyEnv?: string;
  apiKeyFile?: string;
  apiKeyStdin: boolean;
  apply: boolean;
  yes: boolean;
  databaseId?: number;
  overwriteName: boolean;
  archiveOrphans: boolean;
  mappingPath?: string;
  allowUnresolvedValuesSource: boolean;
  reportPath?: string;
  timeoutMs: number;
};

export const OPTION_SPEC = {
  source: { type: 'string' },
  target: { type: 'string' },
  url: { type: 'string' },
  'api-key-env': { type: 'string' },
  'api-key-file': { type: 'string' },
  'api-key-stdin': { type: 'boolean' },
  apply: { type: 'boolean' },
  yes: { type: 'boolean' },
  'database-id': { type: 'string' },
  'overwrite-name': { type: 'boolean' },
  'archive-orphans': { type: 'boolean' },
  mapping: { type: 'string' },
  'allow-unresolved-values-source': { type: 'boolean' },
  report: { type: 'string' },
  timeout: { type: 'string' },
} as const satisfies ParseArgsConfig['options'];

export function parseOptions(argv: readonly string[]): Options {
  assertNoInlineSecret(argv);

  let values: Record<string, string | boolean | undefined>;
  try {
    ({ values } = parseArgs({ args: [...argv], options: OPTION_SPEC, strict: true, allowPositionals: false }));
  } catch (error) {
    throw new UserError(error instanceof Error ? error.message : String(error));
  }

  const str = (name: keyof typeof OPTION_SPEC): string | undefined => {
    const value = values[name];
    return typeof value === 'string' ? value : undefined;
  };
  const bool = (name: keyof typeof OPTION_SPEC): boolean => values[name] === true;
  const int = (name: keyof typeof OPTION_SPEC): number | undefined => {
    const raw = str(name);
    if (raw === undefined) return undefined;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== raw.trim()) {
      throw new UserError(`--${name} must be a positive integer, got "${raw}"`);
    }
    return parsed;
  };

  const source = int('source');
  const target = int('target');
  if (source === undefined) throw new UserError('--source <dashboard-id> is required (the snapshot to restore)');
  if (target === undefined) throw new UserError('--target <dashboard-id> is required (the dashboard to restore onto)');

  const reportPath = str('report');
  if (reportPath !== undefined && !reportPath.endsWith('.json')) {
    throw new UserError(`--report must name a .json file (got "${reportPath}"); it is overwritten in place`);
  }

  const url = str('url') ?? process.env.METABASE_TARGET_SITE_URL ?? process.env.METABASE_SITE_URL;
  if (!url) {
    throw new UserError('Missing target URL: pass --url, or set METABASE_TARGET_SITE_URL / METABASE_SITE_URL');
  }

  return {
    source,
    target,
    url,
    urlFromEnv: str('url') === undefined,
    apiKeyEnv: str('api-key-env'),
    apiKeyFile: str('api-key-file'),
    apiKeyStdin: bool('api-key-stdin'),
    apply: bool('apply'),
    yes: bool('yes'),
    databaseId: int('database-id'),
    overwriteName: bool('overwrite-name'),
    archiveOrphans: bool('archive-orphans'),
    mappingPath: str('mapping'),
    allowUnresolvedValuesSource: bool('allow-unresolved-values-source'),
    reportPath,
    timeoutMs: int('timeout') ?? DEFAULT_TIMEOUT_MS,
  };
}

export async function loadExplicitMapping(path: string | undefined): Promise<Map<number, number>> {
  if (!path) return new Map();
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  const cards = isObject(parsed) ? parsed.cards : undefined;
  if (!isObject(cards)) throw new UserError(`${path} must look like { "cards": { "<sourceId>": <targetId> } }`);
  const mapping = new Map<number, number>();
  const claimed = new Map<number, number>();
  for (const [sourceId, targetId] of Object.entries(cards)) {
    const from = Number.parseInt(sourceId, 10);
    if (!isEntityId(from) || !isEntityId(targetId)) {
      throw new UserError(
        `${path}: invalid mapping entry "${sourceId}": ${JSON.stringify(targetId)} — both ids must be positive integers`,
      );
    }

    const previous = claimed.get(targetId);
    if (previous !== undefined) {
      throw new UserError(`${path}: cards ${previous} and ${from} are both mapped onto target card ${targetId}`);
    }
    claimed.set(targetId, from);
    mapping.set(from, targetId);
  }
  return mapping;
}
