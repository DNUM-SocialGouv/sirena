import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIMEOUT_MS, parseOptions } from './cli.js';
import { UserError } from './user-error.js';

const REQUIRED = ['--source', '4', '--target', '12', '--url', 'https://metabase.test'] as const;

const withArgs = (...extra: string[]): string[] => [...REQUIRED, ...extra];

const clearUrlEnv = (): void => {
  vi.stubEnv('METABASE_TARGET_SITE_URL', undefined);
  vi.stubEnv('METABASE_SITE_URL', undefined);
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('parseOptions', () => {
  it('reads the required ids and defaults everything else', () => {
    const options = parseOptions(REQUIRED);

    expect(options).toMatchObject({
      source: 4,
      target: 12,
      url: 'https://metabase.test',
      urlFromEnv: false,
      apiKeyStdin: false,
      apply: false,
      yes: false,
      overwriteName: false,
      archiveOrphans: false,
      allowUnresolvedValuesSource: false,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    expect(options.reportPath).toBeUndefined();
    expect(options.databaseId).toBeUndefined();
  });

  it('accepts the boolean switches', () => {
    const options = parseOptions(withArgs('--apply', '--yes', '--overwrite-name', '--archive-orphans'));

    expect(options).toMatchObject({ apply: true, yes: true, overwriteName: true, archiveOrphans: true });
  });
});

describe('parseOptions value forms', () => {
  it('accepts --report=<path>, the form a hand-rolled parser used to drop', () => {
    expect(parseOptions(withArgs('--report=/tmp/r.json')).reportPath).toBe('/tmp/r.json');
  });

  it('accepts the spaced --report <path> too', () => {
    expect(parseOptions(withArgs('--report', '/tmp/r.json')).reportPath).toBe('/tmp/r.json');
  });

  it('reads --source=<id> and --target=<id> in their attached form', () => {
    const options = parseOptions(['--source=4', '--target=12', '--url=https://metabase.test']);

    expect(options).toMatchObject({ source: 4, target: 12, url: 'https://metabase.test' });
  });
});

describe('parseOptions unknown flags', () => {
  it.each(['--aply', '--dry-run', '--force'])('refuses %s instead of ignoring it', (flag) => {
    expect(() => parseOptions(withArgs(flag))).toThrow(UserError);
  });

  it('refuses a positional argument', () => {
    expect(() => parseOptions(withArgs('restore'))).toThrow(UserError);
  });
});

describe('parseOptions missing values', () => {
  it('refuses --url swallowing the flag that follows it', () => {
    expect(() => parseOptions(['--source', '4', '--target', '12', '--url', '--apply'])).toThrow(UserError);
  });

  it('refuses --url at the end of the command line', () => {
    expect(() => parseOptions(['--source', '4', '--target', '12', '--url'])).toThrow(UserError);
  });

  it('refuses a value on a boolean flag', () => {
    expect(() => parseOptions(withArgs('--apply=false'))).toThrow(UserError);
  });
});

describe('parseOptions ids', () => {
  it('requires --source', () => {
    expect(() => parseOptions(['--target', '12', '--url', 'https://metabase.test'])).toThrow(/--source/);
    expect(() => parseOptions(['--target', '12', '--url', 'https://metabase.test'])).toThrow(UserError);
  });

  it('requires --target', () => {
    expect(() => parseOptions(['--source', '4', '--url', 'https://metabase.test'])).toThrow(/--target/);
    expect(() => parseOptions(['--source', '4', '--url', 'https://metabase.test'])).toThrow(UserError);
  });

  it.each(['0', '-3', '1.5', 'abc', '12abc', ''])('rejects --source=%j', (raw) => {
    expect(() => parseOptions([`--source=${raw}`, '--target', '12', '--url', 'https://metabase.test'])).toThrow(
      UserError,
    );
  });

  it.each(['0', '-3', '1.5', 'abc', '12abc'])('rejects --target=%j', (raw) => {
    expect(() => parseOptions(['--source', '4', `--target=${raw}`, '--url', 'https://metabase.test'])).toThrow(
      UserError,
    );
  });

  it('names the offending option and value', () => {
    expect(() => parseOptions([`--source=12abc`, '--target', '12', '--url', 'https://metabase.test'])).toThrow(
      '--source must be a positive integer, got "12abc"',
    );
  });

  it('rejects a non-integer --database-id', () => {
    expect(() => parseOptions(withArgs('--database-id=x'))).toThrow(UserError);
  });

  it('keeps a valid --database-id', () => {
    expect(parseOptions(withArgs('--database-id', '7')).databaseId).toBe(7);
  });
});

describe('parseOptions --report', () => {
  it('refuses a path that does not name a .json file', () => {
    expect(() => parseOptions(withArgs('--report', '/tmp/report.txt'))).toThrow(UserError);
    expect(() => parseOptions(withArgs('--report', '/tmp/report.txt'))).toThrow(/must name a \.json file/);
  });

  it('refuses a directory-looking path', () => {
    expect(() => parseOptions(withArgs('--report', '/tmp/reports/'))).toThrow(UserError);
  });
});

describe('parseOptions --timeout', () => {
  it('defaults to DEFAULT_TIMEOUT_MS', () => {
    expect(parseOptions(REQUIRED).timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
  });

  it('takes the value given', () => {
    expect(parseOptions(withArgs('--timeout', '5000')).timeoutMs).toBe(5000);
  });

  it('rejects a non-positive timeout', () => {
    expect(() => parseOptions(withArgs('--timeout=0'))).toThrow(UserError);
  });
});

describe('parseOptions url fallback', () => {
  it('falls back to METABASE_TARGET_SITE_URL and says the URL came from the environment', () => {
    clearUrlEnv();
    vi.stubEnv('METABASE_TARGET_SITE_URL', 'https://target.test');

    const options = parseOptions(['--source', '4', '--target', '12']);

    expect(options).toMatchObject({ url: 'https://target.test', urlFromEnv: true });
  });

  it('falls back to METABASE_SITE_URL when the target-specific variable is unset', () => {
    clearUrlEnv();
    vi.stubEnv('METABASE_SITE_URL', 'https://site.test');

    expect(parseOptions(['--source', '4', '--target', '12'])).toMatchObject({
      url: 'https://site.test',
      urlFromEnv: true,
    });
  });

  it('prefers METABASE_TARGET_SITE_URL over METABASE_SITE_URL', () => {
    vi.stubEnv('METABASE_TARGET_SITE_URL', 'https://target.test');
    vi.stubEnv('METABASE_SITE_URL', 'https://site.test');

    expect(parseOptions(['--source', '4', '--target', '12']).url).toBe('https://target.test');
  });

  it('gives --url precedence over both variables and does not flag it as coming from the environment', () => {
    vi.stubEnv('METABASE_TARGET_SITE_URL', 'https://target.test');
    vi.stubEnv('METABASE_SITE_URL', 'https://site.test');

    expect(parseOptions(REQUIRED)).toMatchObject({ url: 'https://metabase.test', urlFromEnv: false });
  });

  it('refuses to run without any URL', () => {
    clearUrlEnv();

    expect(() => parseOptions(['--source', '4', '--target', '12'])).toThrow(UserError);
    expect(() => parseOptions(['--source', '4', '--target', '12'])).toThrow(/Missing target URL/);
  });
});
