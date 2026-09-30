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
  help: { type: 'boolean', short: 'h' },
} as const satisfies ParseArgsConfig['options'];

export const USAGE = `Restore a Metabase dashboard from a snapshot in docs/metabase_dashboards/<id>/.

Usage: pnpm op:metabase:restore-dashboard --source <id> --target <id> [options]

Dry run by default: prints the plan (cards, layout, filters, dashboard settings) and writes nothing.

Required
  --source <id>            Snapshot to restore (docs/metabase_dashboards/<id>)
  --target <id>            Dashboard id to restore onto, on the target Metabase

Target
  --url <url>              Target Metabase URL (default: METABASE_TARGET_SITE_URL, then METABASE_SITE_URL)
  --api-key-env <VAR>      Read the API key from this environment variable
  --api-key-file <path>    Read the API key from a file (chmod 600 recommended)
  --api-key-stdin          Read the API key from stdin (with --apply, add --yes)
                           Default: METABASE_TARGET_API_KEY, then METABASE_API_KEY.
                           An inline --api-key/--token/--secret value is refused.
  --database-id <id>       Database the cards should query (default: the one the target's cards use)
  --timeout <ms>           Per-request timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS})

Writing
  --apply                  Write the plan to the target (asks to type the target host first)
  --yes                    Skip the confirmation prompt (needed when stdin is not a TTY)
  --overwrite-name         Also overwrite the target dashboard name with the snapshot's
  --archive-orphans        Archive target cards the snapshot no longer references

Matching
  --mapping <file.json>    Explicit card mapping: { "cards": { "<sourceId>": <targetId> } }
  --allow-unresolved-values-source
                           Fall back to free-text filters when a filter's values-source card
                           was never exported and has no counterpart on the target

Output
  --report <file.json>     Write a JSON report of the plan and its execution (overwritten in place)
  -h, --help               Show this help
`;

export function wantsHelp(argv: readonly string[]): boolean {
  const { values } = parseArgs({ args: [...argv], options: OPTION_SPEC, strict: false, allowPositionals: true });
  return values.help === true;
}

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
