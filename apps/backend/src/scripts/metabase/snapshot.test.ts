import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  extractCardIds,
  extractValuesSourceCardIds,
  isDeepEqual,
  loadSnapshot,
  normalize,
  VOLATILE_KEYS,
} from './snapshot.js';

describe('normalize', () => {
  it('sorts keys and strips volatile fields recursively', () => {
    const normalized = normalize({
      b: 1,
      a: { updated_at: 'now', view_count: 3, z: [{ created_at: 'x', y: 2 }] },
    });
    expect(JSON.stringify(normalized)).toBe('{"a":{"z":[{"y":2}]},"b":1}');
  });
});

describe('isDeepEqual', () => {
  it('ignores key order and volatile fields', () => {
    expect(isDeepEqual({ a: 1, b: 2, updated_at: 'x' }, { b: 2, a: 1 })).toBe(true);
    expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('extractCardIds', () => {
  it('collects dashcard cards and their extra series', () => {
    expect(
      extractCardIds({
        dashcards: [{ card_id: 7, series: [{ id: 9 }] }, { card_id: 7 }, { card_id: 3 }],
      }),
    ).toEqual([3, 7, 9]);
  });
});

describe('extractValuesSourceCardIds', () => {
  it('finds the cards feeding a filter dropdown, however deeply nested', () => {
    expect(
      extractValuesSourceCardIds({
        parameters: [{ values_source_config: { card_id: 46 } }],
        dashcards: [{ card: { parameters: [{ values_source_config: { card_id: 46 } }] } }],
      }),
    ).toEqual([46]);
  });

  it('ignores static value lists', () => {
    expect(extractValuesSourceCardIds({ parameters: [{ values_source_config: { values: [['A']] } }] })).toEqual([]);
  });
});

describe('VOLATILE_KEYS', () => {
  it.each(['public_uuid', 'made_public_by_id', 'creator', 'last_used_param_values', 'metabase_version'])(
    'strips %s, which must never reach a public repo',
    (key) => {
      expect(VOLATILE_KEYS.has(key)).toBe(true);
      expect(normalize({ [key]: 'secret', keep: 1 })).toEqual({ keep: 1 });
    },
  );
});

describe('loadSnapshot', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'sirena-snapshot-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const write = async (relative: string, payload: unknown): Promise<void> => {
    const path = join(root, relative);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, JSON.stringify(payload));
  };

  it('points at the export command when the snapshot does not exist', async () => {
    await expect(loadSnapshot(root, 4)).rejects.toThrow(/op:metabase:export-dashboard 4/);
  });

  it('loads the dashboard and its cards, and tolerates a missing cards directory', async () => {
    await write('4/dashboard.json', { name: 'Stats', dashcards: [] });
    const snapshot = await loadSnapshot(root, 4);
    expect(snapshot.dashboard.name).toBe('Stats');
    expect(snapshot.cards.size).toBe(0);
  });

  it('indexes cards by id and ignores non-JSON files', async () => {
    await write('4/dashboard.json', { dashcards: [{ card_id: 45 }] });
    await write('4/cards/45.json', { id: 45, name: 'Requêtes' });
    await writeFile(join(root, '4/cards/README.md'), 'not a card');
    const snapshot = await loadSnapshot(root, 4);
    expect([...snapshot.cards.keys()]).toEqual([45]);
    expect(snapshot.missingDashcardCardIds).toEqual([]);
  });

  it('reports the cards a dashcard needs but the export did not capture', async () => {
    await write('4/dashboard.json', { dashcards: [{ card_id: 45 }, { card_id: 46 }] });
    await write('4/cards/45.json', { id: 45, name: 'Requêtes' });
    const snapshot = await loadSnapshot(root, 4);
    expect(snapshot.missingDashcardCardIds).toEqual([46]);
  });

  it('reports a values-source card missing from the export', async () => {
    await write('4/dashboard.json', {
      dashcards: [],
      parameters: [{ slug: 'entity_label', values_source_config: { card_id: 46 } }],
    });
    const snapshot = await loadSnapshot(root, 4);
    expect(snapshot.missingValuesSourceCardIds).toEqual([46]);
  });

  it.each([
    ['a string id', '45'],
    ['a negative id', -1],
    ['no id at all', undefined],
  ])('refuses a card file with %s, since the id becomes a URL segment', async (_label, id) => {
    await write('4/dashboard.json', { dashcards: [] });
    await write('4/cards/45.json', { id, name: 'Requêtes' });
    await expect(loadSnapshot(root, 4)).rejects.toThrow(/positive integer "id"/);
  });
});
