import { open } from 'node:fs/promises';
import { MIN_REDACTABLE_LENGTH, registerSecret } from './secrets.js';
import { UserError } from './user-error.js';

export const DEFAULT_API_KEY_ENV_VARS = ['METABASE_TARGET_API_KEY', 'METABASE_API_KEY'] as const;

export type ApiKeySource =
  | { kind: 'env'; name: string }
  | { kind: 'file'; path: string }
  | { kind: 'stdin' }
  | { kind: 'default-env'; name: string };

export type ResolvedApiKey = { apiKey: string; source: ApiKeySource; warnings: string[] };

const readStdin = async (): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

const INLINE_SECRET_FLAG = /^--(api[-_]?key|token|secret)(=|$)/i;

export function assertNoInlineSecret(argv: readonly string[]): void {
  const offender = argv.find((arg) => INLINE_SECRET_FLAG.test(arg));
  if (!offender) return;
  const flag = offender.split('=')[0];
  throw new UserError(
    `${flag} is refused: a secret passed on the command line is visible to every process on the host (ps) ` +
      'and lands in shell history. Use --api-key-env <VAR>, --api-key-file <path> or --api-key-stdin instead.',
  );
}

function warnIfUnredactable(apiKey: string, warnings: string[]): void {
  if (registerSecret(apiKey)) return;
  warnings.push(
    `the API key is shorter than ${MIN_REDACTABLE_LENGTH} characters, so it cannot be scrubbed from error ` +
      'messages or the report — check the output before sharing it',
  );
}

export async function resolveApiKey(options: {
  envVar?: string;
  file?: string;
  stdin?: boolean;
}): Promise<ResolvedApiKey> {
  const warnings: string[] = [];

  const sources = [
    options.envVar !== undefined && 'env',
    options.file !== undefined && 'file',
    options.stdin === true && 'stdin',
  ].filter(Boolean);
  if (sources.length > 1) {
    throw new UserError('Pick a single API key source: --api-key-env, --api-key-file or --api-key-stdin');
  }
  if (options.envVar !== undefined && options.envVar.trim() === '') {
    throw new UserError('--api-key-env needs the name of an environment variable');
  }
  if (options.file !== undefined && options.file.trim() === '') {
    throw new UserError('--api-key-file needs a path');
  }

  if (options.file !== undefined) {
    const handle = await open(options.file, 'r');
    try {
      const mode = (await handle.stat()).mode & 0o777;
      if (mode & 0o077) {
        warnings.push(`${options.file} is readable by other users (mode ${mode.toString(8)}) — chmod 600 it`);
      }
      const apiKey = (await handle.readFile('utf8')).trim();
      if (!apiKey) throw new UserError(`${options.file} is empty`);
      warnIfUnredactable(apiKey, warnings);
      return { apiKey, source: { kind: 'file', path: options.file }, warnings };
    } finally {
      await handle.close();
    }
  }

  if (options.stdin) {
    const apiKey = (await readStdin()).trim();
    if (!apiKey) throw new UserError('No API key received on stdin');
    warnIfUnredactable(apiKey, warnings);
    return { apiKey, source: { kind: 'stdin' }, warnings };
  }

  if (options.envVar !== undefined) {
    const apiKey = process.env[options.envVar]?.trim();
    if (!apiKey) throw new UserError(`Environment variable ${options.envVar} is empty or unset`);
    warnIfUnredactable(apiKey, warnings);
    return { apiKey, source: { kind: 'env', name: options.envVar }, warnings };
  }

  for (const name of DEFAULT_API_KEY_ENV_VARS) {
    const apiKey = process.env[name]?.trim();
    if (apiKey) {
      warnIfUnredactable(apiKey, warnings);
      return { apiKey, source: { kind: 'default-env', name }, warnings };
    }
  }

  throw new UserError(
    `No API key found. Set ${DEFAULT_API_KEY_ENV_VARS.join(' or ')}, ` +
      'or pass --api-key-env <VAR>, --api-key-file <path>, --api-key-stdin.',
  );
}

export function describeApiKeySource(source: ApiKeySource): string {
  switch (source.kind) {
    case 'env':
    case 'default-env':
      return `env ${source.name}`;
    case 'file':
      return `file ${source.path}`;
    case 'stdin':
      return 'stdin';
  }
}
