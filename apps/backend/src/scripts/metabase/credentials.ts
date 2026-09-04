import { readFile, stat } from 'node:fs/promises';

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

export function assertNoInlineSecret(argv: readonly string[]): void {
  const offender = argv.find((arg) => /^--(api[-_]?key|token|secret)=/i.test(arg));
  if (!offender) return;
  const flag = offender.split('=')[0];
  throw new Error(
    `${flag}=… is refused: a secret passed on the command line is visible to every process on the host (ps) ` +
      'and lands in shell history. Use --api-key-env <VAR>, --api-key-file <path> or --api-key-stdin instead.',
  );
}

export async function resolveApiKey(options: {
  envVar?: string;
  file?: string;
  stdin?: boolean;
}): Promise<ResolvedApiKey> {
  const warnings: string[] = [];

  if ([options.envVar, options.file, options.stdin ? 'stdin' : undefined].filter(Boolean).length > 1) {
    throw new Error('Pick a single API key source: --api-key-env, --api-key-file or --api-key-stdin');
  }

  if (options.file) {
    const mode = (await stat(options.file)).mode & 0o777;
    if (mode & 0o077) {
      warnings.push(`${options.file} is readable by other users (mode ${mode.toString(8)}) — chmod 600 it`);
    }
    const apiKey = (await readFile(options.file, 'utf8')).trim();
    if (!apiKey) throw new Error(`${options.file} is empty`);
    return { apiKey, source: { kind: 'file', path: options.file }, warnings };
  }

  if (options.stdin) {
    const apiKey = (await readStdin()).trim();
    if (!apiKey) throw new Error('No API key received on stdin');
    return { apiKey, source: { kind: 'stdin' }, warnings };
  }

  if (options.envVar) {
    const apiKey = process.env[options.envVar]?.trim();
    if (!apiKey) throw new Error(`Environment variable ${options.envVar} is empty or unset`);
    return { apiKey, source: { kind: 'env', name: options.envVar }, warnings };
  }

  for (const name of DEFAULT_API_KEY_ENV_VARS) {
    const apiKey = process.env[name]?.trim();
    if (apiKey) return { apiKey, source: { kind: 'default-env', name }, warnings };
  }

  throw new Error(
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
