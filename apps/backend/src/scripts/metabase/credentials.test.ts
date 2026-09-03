import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ApiKeySource, assertNoInlineSecret, describeApiKeySource, resolveApiKey } from './credentials.js';
import { MIN_REDACTABLE_LENGTH } from './secrets.js';
import { UserError } from './user-error.js';

const directories: string[] = [];

const writeKeyFile = async (contents: string, mode = 0o600): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'metabase-credentials-'));
  directories.push(directory);
  const path = join(directory, 'api-key');
  await writeFile(path, contents, { mode });
  await chmod(path, mode);
  return path;
};

const stubStdin = (contents: string): void => {
  vi.spyOn(process, 'stdin', 'get').mockReturnValue(
    Readable.from([Buffer.from(contents)]) as unknown as typeof process.stdin,
  );
};

const clearDefaultEnv = (): void => {
  vi.stubEnv('METABASE_TARGET_API_KEY', undefined);
  vi.stubEnv('METABASE_API_KEY', undefined);
};

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('assertNoInlineSecret', () => {
  it.each([
    ['--api-key=mb_inline_key_1'],
    ['--api-key', 'mb_inline_key_2'],
    ['--token=mb_inline_key_3'],
    ['--token', 'mb_inline_key_4'],
    ['--secret=mb_inline_key_5'],
    ['--secret', 'mb_inline_key_6'],
    ['--api_key=mb_inline_key_7'],
    ['--apikey', 'mb_inline_key_8'],
  ])('refuses %s', (...argv) => {
    expect(() => assertNoInlineSecret(argv)).toThrow(UserError);
    expect(() => assertNoInlineSecret(argv)).toThrow(/is refused/);
  });

  it.each(['--API-KEY=mb_inline_key_9', '--Token=mb_inline_key_10', '--SECRET=mb_inline_key_11'])(
    'refuses %s whatever the case',
    (flag) => {
      expect(() => assertNoInlineSecret([flag])).toThrow(/is refused/);
    },
  );

  it('names the flag without echoing the secret it carried', () => {
    expect(() => assertNoInlineSecret(['--api-key=mb_inline_key_12'])).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('--api-key is refused'),
      }),
    );
    try {
      assertNoInlineSecret(['--api-key=mb_inline_key_12']);
      expect.unreachable('expected assertNoInlineSecret to throw');
    } catch (error) {
      expect((error as Error).message).not.toContain('mb_inline_key_12');
    }
  });

  it.each([
    ['--api-key-env', 'METABASE_API_KEY'],
    ['--api-key-file', '/run/secrets/metabase'],
    ['--api-key-stdin'],
    ['--source', '4', '--target', '12'],
  ])('accepts %s, which names a source rather than a secret', (...argv) => {
    expect(() => assertNoInlineSecret(argv)).not.toThrow();
  });

  it('accepts an empty command line', () => {
    expect(() => assertNoInlineSecret([])).not.toThrow();
  });
});

describe('resolveApiKey source exclusivity', () => {
  const combinations: [string, Parameters<typeof resolveApiKey>[0]][] = [
    ['env and file', { envVar: 'METABASE_API_KEY', file: '/run/secrets/metabase' }],
    ['env and stdin', { envVar: 'METABASE_API_KEY', stdin: true }],
    ['file and stdin', { file: '/run/secrets/metabase', stdin: true }],
  ];

  it.each(combinations)('refuses %s together', async (_label, options) => {
    await expect(resolveApiKey(options)).rejects.toThrow(UserError);
    await expect(resolveApiKey(options)).rejects.toThrow(/single API key source/);
  });

  it('accepts a single source', async () => {
    vi.stubEnv('MB_KEY_SINGLE_SOURCE', 'mb_key_single_source_value');

    await expect(resolveApiKey({ envVar: 'MB_KEY_SINGLE_SOURCE' })).resolves.toMatchObject({
      apiKey: 'mb_key_single_source_value',
    });
  });
});

describe('resolveApiKey precedence', () => {
  it('reads the file even when the default variables are set', async () => {
    vi.stubEnv('METABASE_TARGET_API_KEY', 'mb_key_default_target_loses');
    const path = await writeKeyFile('mb_key_from_file_wins');

    const resolved = await resolveApiKey({ file: path });

    expect(resolved.apiKey).toBe('mb_key_from_file_wins');
    expect(resolved.source).toEqual({ kind: 'file', path });
  });

  it('reads stdin rather than the default variables', async () => {
    vi.stubEnv('METABASE_TARGET_API_KEY', 'mb_key_default_target_loses');
    stubStdin('mb_key_from_stdin_wins');

    const resolved = await resolveApiKey({ stdin: true });

    expect(resolved.apiKey).toBe('mb_key_from_stdin_wins');
    expect(resolved.source).toEqual({ kind: 'stdin' });
  });

  it('reads the named variable rather than the default ones', async () => {
    vi.stubEnv('METABASE_TARGET_API_KEY', 'mb_key_default_target_loses');
    vi.stubEnv('MB_KEY_EXPLICIT_ENV', 'mb_key_explicit_env_wins');

    const resolved = await resolveApiKey({ envVar: 'MB_KEY_EXPLICIT_ENV' });

    expect(resolved.apiKey).toBe('mb_key_explicit_env_wins');
    expect(resolved.source).toEqual({ kind: 'env', name: 'MB_KEY_EXPLICIT_ENV' });
  });

  it('prefers METABASE_TARGET_API_KEY over METABASE_API_KEY', async () => {
    vi.stubEnv('METABASE_TARGET_API_KEY', 'mb_key_default_target_first');
    vi.stubEnv('METABASE_API_KEY', 'mb_key_default_generic_second');

    const resolved = await resolveApiKey({});

    expect(resolved.apiKey).toBe('mb_key_default_target_first');
    expect(resolved.source).toEqual({ kind: 'default-env', name: 'METABASE_TARGET_API_KEY' });
  });

  it('falls back to METABASE_API_KEY when the target-specific variable is unset', async () => {
    clearDefaultEnv();
    vi.stubEnv('METABASE_API_KEY', 'mb_key_default_generic_only');

    const resolved = await resolveApiKey({});

    expect(resolved.source).toEqual({ kind: 'default-env', name: 'METABASE_API_KEY' });
  });
});

describe('resolveApiKey missing keys', () => {
  it('refuses when no source and no default variable carries a key', async () => {
    clearDefaultEnv();

    await expect(resolveApiKey({})).rejects.toThrow(/No API key found/);
  });

  it('refuses an unset named variable', async () => {
    vi.stubEnv('MB_KEY_ABSENT', undefined);

    await expect(resolveApiKey({ envVar: 'MB_KEY_ABSENT' })).rejects.toThrow(/MB_KEY_ABSENT is empty or unset/);
  });

  it('refuses a named variable holding only whitespace', async () => {
    vi.stubEnv('MB_KEY_BLANK', '   ');

    await expect(resolveApiKey({ envVar: 'MB_KEY_BLANK' })).rejects.toThrow(/MB_KEY_BLANK is empty or unset/);
  });

  it('ignores a default variable holding only whitespace', async () => {
    clearDefaultEnv();
    vi.stubEnv('METABASE_TARGET_API_KEY', '  ');
    vi.stubEnv('METABASE_API_KEY', 'mb_key_default_generic_fallback');

    expect((await resolveApiKey({})).source).toEqual({ kind: 'default-env', name: 'METABASE_API_KEY' });
  });

  it('refuses an empty key file', async () => {
    const path = await writeKeyFile('\n');

    await expect(resolveApiKey({ file: path })).rejects.toThrow(/is empty/);
  });

  it('refuses an empty stdin', async () => {
    stubStdin('\n  \n');

    await expect(resolveApiKey({ stdin: true })).rejects.toThrow(/No API key received on stdin/);
  });

  it('reports a missing key file rather than falling back to the environment', async () => {
    vi.stubEnv('METABASE_TARGET_API_KEY', 'mb_key_default_target_unused');

    await expect(resolveApiKey({ file: join(tmpdir(), 'metabase-credentials-absent', 'api-key') })).rejects.toThrow();
  });
});

describe('resolveApiKey file permissions', () => {
  it('warns when the key file is readable by other users', async () => {
    const path = await writeKeyFile('mb_key_world_readable', 0o644);

    const resolved = await resolveApiKey({ file: path });

    expect(resolved.warnings).toEqual([expect.stringContaining('readable by other users')]);
    expect(resolved.warnings[0]).toContain('mode 644');
  });

  it('stays quiet on a file only its owner can read', async () => {
    const path = await writeKeyFile('mb_key_owner_only', 0o600);

    expect((await resolveApiKey({ file: path })).warnings).toEqual([]);
  });

  it('trims the trailing newline a key file usually carries', async () => {
    const path = await writeKeyFile('mb_key_trailing_newline\n');

    expect((await resolveApiKey({ file: path })).apiKey).toBe('mb_key_trailing_newline');
  });
});

describe('resolveApiKey unredactable keys', () => {
  it(`warns when the key is shorter than ${MIN_REDACTABLE_LENGTH} characters`, async () => {
    vi.stubEnv('MB_KEY_SHORT', 'a'.repeat(MIN_REDACTABLE_LENGTH - 1));

    const resolved = await resolveApiKey({ envVar: 'MB_KEY_SHORT' });

    expect(resolved.warnings).toEqual([expect.stringContaining(`shorter than ${MIN_REDACTABLE_LENGTH} characters`)]);
  });

  it('stays quiet on a key long enough to be scrubbed', async () => {
    vi.stubEnv('MB_KEY_LONG', 'mb_key_long_enough_to_scrub');

    expect((await resolveApiKey({ envVar: 'MB_KEY_LONG' })).warnings).toEqual([]);
  });

  it('carries both the permission and the length warning', async () => {
    const path = await writeKeyFile('short12', 0o644);

    expect((await resolveApiKey({ file: path })).warnings).toHaveLength(2);
  });
});

describe('describeApiKeySource', () => {
  const sources: [ApiKeySource, string][] = [
    [{ kind: 'env', name: 'MB_KEY' }, 'env MB_KEY'],
    [{ kind: 'default-env', name: 'METABASE_API_KEY' }, 'env METABASE_API_KEY'],
    [{ kind: 'file', path: '/run/secrets/metabase' }, 'file /run/secrets/metabase'],
    [{ kind: 'stdin' }, 'stdin'],
  ];

  it.each(sources)('describes %j as %s', (source, expected) => {
    expect(describeApiKeySource(source)).toBe(expected);
  });
});

describe('resolveApiKey, empty source values', () => {
  it('refuses --api-key-env with an empty name instead of falling back to the environment', async () => {
    vi.stubEnv('METABASE_API_KEY', 'mb_environment_fallback_key');
    await expect(resolveApiKey({ envVar: '' })).rejects.toThrow(/--api-key-env needs the name/);
  });

  it('refuses --api-key-file with an empty path', async () => {
    vi.stubEnv('METABASE_API_KEY', 'mb_environment_fallback_key');
    await expect(resolveApiKey({ file: '' })).rejects.toThrow(/--api-key-file needs a path/);
  });

  it('counts an empty source as a source, so two sources still conflict', async () => {
    await expect(resolveApiKey({ envVar: '', stdin: true })).rejects.toThrow(/Pick a single API key source/);
  });
});
