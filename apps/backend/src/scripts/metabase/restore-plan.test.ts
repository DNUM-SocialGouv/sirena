import { describe, expect, it } from 'vitest';
import type { Options } from './cli.js';
import { buildPlan, type PlanContext, resolveDatabaseId } from './restore-plan.js';
import type { DashboardSnapshot, JsonObject } from './snapshot.js';

const options = (overrides: Partial<Options> = {}): Options => ({
  source: 4,
  target: 12,
  url: 'https://metabase.example.com',
  urlFromEnv: false,
  apiKeyStdin: false,
  apply: false,
  yes: false,
  overwriteName: false,
  archiveOrphans: false,
  allowUnresolvedValuesSource: false,
  timeoutMs: 30_000,
  ...overrides,
});

const card = (id: number, name: string, extra: JsonObject = {}): JsonObject => ({
  id,
  name,
  description: null,
  display: 'table',
  type: 'question',
  dataset_query: { type: 'native', database: 1, native: { query: `select ${id}` } },
  visualization_settings: {},
  parameters: [],
  archived: false,
  ...extra,
});

const snapshotOf = (dashboard: JsonObject, cards: JsonObject[]): DashboardSnapshot => ({
  dashboardId: 4,
  dir: 'docs/metabase_dashboards/4',
  dashboard,
  cards: new Map(cards.map((c) => [c.id as number, c])),
  missingDashcardCardIds: [],
  missingValuesSourceCardIds: [],
});

const dashcard = (id: number, cardId: number | null, row = 0, col = 0): JsonObject => ({
  id,
  card_id: cardId,
  row,
  col,
  size_x: 6,
  size_y: 4,
  series: [],
  parameter_mappings: [],
  visualization_settings: {},
});

const contextOf = (overrides: Partial<PlanContext> = {}): PlanContext => {
  const source = card(45, 'Nombre de requêtes');
  const snapshot = snapshotOf({ name: 'Stats', dashcards: [dashcard(1, 45)], parameters: [] }, [source]);
  return {
    options: options(),
    snapshot,
    targetDashboard: { name: 'Stats (prod)', dashcards: [], parameters: [] },
    plannedCards: [source],
    targetCards: new Map(),
    idMap: new Map(),
    matchedBy: new Map(),
    databaseId: 2,
    ...overrides,
  };
};

describe('resolveDatabaseId', () => {
  it('prefers the explicit --database-id', () => {
    expect(resolveDatabaseId(options({ databaseId: 7 }), new Map(), snapshotOf({}, []))).toBe(7);
  });

  it('infers the single database the target cards use', () => {
    const targetCards = new Map([[1, card(1, 'a', { database_id: 3 })]]);
    expect(resolveDatabaseId(options(), targetCards, snapshotOf({}, []))).toBe(3);
  });

  it('names the snapshot database when the target has nothing to infer from', () => {
    const snapshot = snapshotOf({}, [card(45, 'a')]);
    expect(() => resolveDatabaseId(options(), new Map(), snapshot)).toThrow(/against database 1\)/);
  });

  it('refuses to guess when the target mixes data sources', () => {
    const targetCards = new Map([
      [1, card(1, 'a', { database_id: 3 })],
      [2, card(2, 'b', { database_id: 5 })],
    ]);
    expect(() => resolveDatabaseId(options(), targetCards, snapshotOf({}, []))).toThrow(/mixes several data sources/);
  });
});

describe('buildPlan', () => {
  it('plans an unmatched snapshot card for creation, on the resolved database', () => {
    const plan = buildPlan(contextOf());
    expect(plan.cardPlans).toHaveLength(1);
    expect(plan.cardPlans[0]).toMatchObject({ sourceId: 45, targetId: null, action: 'create', databaseId: 2 });
    expect(plan.cardPlans[0].payload.dataset_query).toMatchObject({ database: 2 });
    expect(plan.errors).toEqual([]);
  });

  it('keeps the data source of a card that already exists on the target', () => {
    const target = card(90, 'Nombre de requêtes', { database_id: 9 });
    const plan = buildPlan(
      contextOf({ targetCards: new Map([[90, target]]), idMap: new Map([[45, 90]]), databaseId: 2 }),
    );
    expect(plan.cardPlans[0]).toMatchObject({ targetId: 90, databaseId: 9 });
    expect(plan.cardPlans[0].payload.dataset_query).toMatchObject({ database: 9 });
  });

  it('reports nothing to change when the target already matches the snapshot', () => {
    const source = card(45, 'Nombre de requêtes');

    const target = card(90, 'Nombre de requêtes', {
      database_id: 1,
      dataset_query: source.dataset_query,
    });
    const dashboard = { name: 'Stats', dashcards: [dashcard(1, 45)], parameters: [] };
    const ctx = contextOf({
      snapshot: snapshotOf(dashboard, [source]),
      targetDashboard: {
        name: 'Stats (prod)',
        dashcards: [dashcard(1, 90)],
        parameters: [],
        enable_embedding: false,
        embedding_params: null,
        auto_apply_filters: true,
        width: 'fixed',
        archived: false,
      },
      plannedCards: [source],
      targetCards: new Map([[90, target]]),
      idMap: new Map([[45, 90]]),
      databaseId: 1,
    });
    const plan = buildPlan(ctx);
    expect(plan.cardPlans[0].action).toBe('unchanged');
    expect(plan.dashboardChangedFields).toEqual([]);
  });

  it('refuses a snapshot whose embedding_params names a filter no longer declared', () => {
    const dashboard = {
      name: 'Stats',
      dashcards: [],
      parameters: [],
      enable_embedding: true,
      embedding_params: { entity_label: 'enabled' },
    };
    const plan = buildPlan(contextOf({ snapshot: snapshotOf(dashboard, []), plannedCards: [] }));
    expect(plan.errors.join(' ')).toMatch(/embedding_params declares "entity_label"/);
  });

  it('only sends embedding_type when the target instance knows it', () => {
    const withoutSupport = buildPlan(contextOf());
    expect('embedding_type' in withoutSupport.dashboardPayload).toBe(false);

    const withSupport = buildPlan(
      contextOf({ targetDashboard: { name: 'x', dashcards: [], parameters: [], embedding_type: null } }),
    );
    expect('embedding_type' in withSupport.dashboardPayload).toBe(true);
  });

  it('copies the name only with --overwrite-name', () => {
    expect('name' in buildPlan(contextOf()).dashboardPayload).toBe(false);
    const overwritten = buildPlan(contextOf({ options: options({ overwriteName: true }) }));
    expect(overwritten.dashboardPayload.name).toBe('Stats');
  });

  it('deduplicates warnings gathered from every card', () => {
    const plan = buildPlan(contextOf());
    expect(plan.warnings).toEqual([...new Set(plan.warnings)]);
  });
});
