import { describe, expect, it } from 'vitest';
import {
  completeParametersFromCards,
  matchCards,
  normalizeName,
  planCard,
  planDashcards,
  planParameters,
  planValuesSourceCards,
  referencesPhysicalSchema,
  remapValuesSources,
} from './plan.js';
import type { JsonObject } from './snapshot.js';

const nativeCard = (overrides: JsonObject = {}): JsonObject => ({
  id: 45,
  name: 'Requêtes cloturées',
  description: null,
  display: 'scalar',
  type: 'question',
  archived: false,
  database_id: 4,
  dataset_query: {
    'lib/type': 'mbql/query',
    database: 4,
    stages: [{ 'lib/type': 'mbql.stage/native', native: 'SELECT 1' }],
  },
  visualization_settings: {},
  parameters: [],
  ...overrides,
});

const passthroughRemap = (parameters: unknown) => ({
  parameters: Array.isArray(parameters) ? parameters : [],
  warnings: [],
  errors: [],
});

describe('normalizeName', () => {
  it('ignores case, accents and repeated whitespace', () => {
    expect(normalizeName('  Requêtes   CLÔTURÉES ')).toBe(normalizeName('requetes cloturees'));
  });
});

describe('matchCards', () => {
  it('reuses the target card bearing the same name', () => {
    const result = matchCards({
      sourceCards: [nativeCard()],
      targetCards: [nativeCard({ id: 301 })],
    });
    expect(result.matches).toEqual([
      { sourceId: 45, sourceName: 'Requêtes cloturées', targetId: 301, matchedBy: 'name' },
    ]);
    expect(result.ambiguities).toEqual([]);
  });

  it('falls back to an accent-insensitive match', () => {
    const result = matchCards({
      sourceCards: [nativeCard({ name: 'Requêtes clôturées' })],
      targetCards: [nativeCard({ id: 301, name: 'Requetes cloturees' })],
    });
    expect(result.matches[0]).toMatchObject({ targetId: 301, matchedBy: 'normalized-name' });
  });

  it('reports a card absent from the target as new', () => {
    const result = matchCards({ sourceCards: [nativeCard({ name: 'Nouvelle carte' })], targetCards: [] });
    expect(result.matches[0]).toMatchObject({ targetId: null, matchedBy: null });
  });

  it('refuses to guess when two target cards share a name', () => {
    const result = matchCards({
      sourceCards: [nativeCard()],
      targetCards: [nativeCard({ id: 301 }), nativeCard({ id: 302 })],
    });
    expect(result.ambiguities).toEqual([{ name: 'Requêtes cloturées', targetIds: [301, 302] }]);
    expect(result.matches[0].targetId).toBeNull();
  });

  it('gives the explicit mapping precedence over the name match', () => {
    const result = matchCards({
      sourceCards: [nativeCard({ name: 'Ancien nom' })],
      targetCards: [nativeCard({ id: 301, name: 'Ancien nom' }), nativeCard({ id: 302, name: 'Nouveau nom' })],
      explicitMapping: new Map([[45, 302]]),
    });
    expect(result.matches[0]).toMatchObject({ targetId: 302, matchedBy: 'explicit-mapping' });
  });

  it('rejects a mapping pointing at a card the target dashboard does not use', () => {
    const result = matchCards({
      sourceCards: [nativeCard()],
      targetCards: [nativeCard({ id: 301 })],
      explicitMapping: new Map([[45, 999]]),
    });
    expect(result.errors).toHaveLength(1);
  });
});

describe('referencesPhysicalSchema', () => {
  it('is false for a native query', () => {
    expect(referencesPhysicalSchema(nativeCard().dataset_query)).toBe(false);
  });

  it('is true for a GUI question bound to table and field ids', () => {
    expect(referencesPhysicalSchema({ query: { 'source-table': 12, filter: ['=', ['field', 42, null], 1] } })).toBe(
      true,
    );
  });
});

describe('planCard', () => {
  it('rewrites the query onto the target data source and reports no change otherwise', () => {
    const target = {
      ...nativeCard({ id: 301 }),
      dataset_query: { ...(nativeCard().dataset_query as JsonObject), database: 7 },
    };
    const plan = planCard({
      source: nativeCard(),
      target,
      matchedBy: 'name',
      databaseId: 7,
      remapParameters: passthroughRemap,
    });
    expect(plan.action).toBe('unchanged');
    expect((plan.payload.dataset_query as JsonObject).database).toBe(7);
  });

  it('lists the fields that actually differ', () => {
    const plan = planCard({
      source: nativeCard({ name: 'Requêtes clôturées' }),
      target: nativeCard({ id: 301, dataset_query: { ...(nativeCard().dataset_query as JsonObject), database: 7 } }),
      matchedBy: 'name',
      databaseId: 7,
      remapParameters: passthroughRemap,
    });
    expect(plan.action).toBe('update');
    expect(plan.changedFields).toEqual(['name']);
  });

  it('creates a card when the target has none', () => {
    const plan = planCard({
      source: nativeCard(),
      target: null,
      matchedBy: null,
      databaseId: 7,
      remapParameters: passthroughRemap,
    });
    expect(plan.action).toBe('create');
    expect(plan.targetId).toBeNull();
  });

  it('refuses to move a GUI question to another database', () => {
    const plan = planCard({
      source: nativeCard({ dataset_query: { database: 4, query: { 'source-table': 12 } } }),
      target: null,
      matchedBy: null,
      databaseId: 7,
      remapParameters: passthroughRemap,
    });
    expect(plan.errors).toHaveLength(1);
    expect(plan.errors[0]).toContain('cannot be retargeted');
  });
});

describe('remapValuesSources', () => {
  const parameters = [
    {
      id: 'cfaa17bb',
      slug: 'entity_label',
      values_source_type: 'card',
      values_source_config: { card_id: 46, value_field: ['field', 'label', {}] },
    },
  ];

  it('remaps the values-source card through the id map', () => {
    const result = remapValuesSources({
      parameters,
      resolveCardId: () => 999,
      targetParametersBySlug: new Map(),
      allowUnresolved: false,
      label: 'dashboard 4',
    });
    expect((result.parameters[0] as JsonObject).values_source_config).toMatchObject({ card_id: 999 });
    expect(result.errors).toEqual([]);
  });

  it("keeps the target's own values-source card when the snapshot does not carry it", () => {
    const result = remapValuesSources({
      parameters,
      resolveCardId: () => null,
      targetParametersBySlug: new Map([
        ['entity_label', { slug: 'entity_label', values_source_config: { card_id: 123 } } as JsonObject],
      ]),
      allowUnresolved: false,
      label: 'dashboard 12',
    });
    expect((result.parameters[0] as JsonObject).values_source_config).toMatchObject({ card_id: 123 });
    expect(result.warnings).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  it('errors out rather than silently dropping an unresolvable values source', () => {
    const result = remapValuesSources({
      parameters,
      resolveCardId: () => null,
      targetParametersBySlug: new Map(),
      allowUnresolved: false,
      label: 'dashboard 12',
    });
    expect(result.errors).toHaveLength(1);
  });

  it('downgrades to a free-text filter when explicitly allowed', () => {
    const result = remapValuesSources({
      parameters,
      resolveCardId: () => null,
      targetParametersBySlug: new Map(),
      allowUnresolved: true,
      label: 'dashboard 12',
    });
    expect(result.parameters[0]).not.toHaveProperty('values_source_config');
    expect(result.errors).toEqual([]);
  });
});

describe('planDashcards', () => {
  const sourceDashcards: JsonObject[] = [
    {
      id: 42,
      card_id: 45,
      row: 0,
      col: 0,
      size_x: 8,
      size_y: 3,
      series: [],
      parameter_mappings: [{ card_id: 45, parameter_id: 'cfaa17bb', target: ['variable', ['template-tag', 'x']] }],
      visualization_settings: {},
    },
  ];

  it('reuses the existing dashcard of an already-placed card', () => {
    const plan = planDashcards({
      sourceDashcards,
      targetDashcards: [{ id: 900, card_id: 301, row: 0, col: 0, size_x: 4, size_y: 2 }],
      resolveCardId: () => 301,
      knownParameterIds: new Set(['cfaa17bb']),
      targetCardName: () => 'x',
    });
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]).toMatchObject({ id: 900, isNew: false, cardId: 301 });
    expect(plan.entries[0].payload.size_x).toBe(8);
    expect(plan.removed).toEqual([]);
  });

  it('uses a negative placeholder id for a dashcard Metabase must create', () => {
    const plan = planDashcards({
      sourceDashcards,
      targetDashcards: [],
      resolveCardId: () => 301,
      knownParameterIds: new Set(['cfaa17bb']),
      targetCardName: () => 'x',
    });
    expect(plan.entries[0].id).toBeLessThan(0);
    expect(plan.entries[0].isNew).toBe(true);
  });

  it('flags an identical grid as unchanged so the dashboard is not rewritten', () => {
    const plan = planDashcards({
      sourceDashcards,
      targetDashcards: [
        {
          id: 900,
          card_id: 301,
          row: 0,
          col: 0,
          size_x: 8,
          size_y: 3,
          series: [],
          action_id: null,
          dashboard_tab_id: null,
          inline_parameters: [],
          visualization_settings: {},
          parameter_mappings: [{ card_id: 301, parameter_id: 'cfaa17bb', target: ['variable', ['template-tag', 'x']] }],
        },
      ],
      resolveCardId: () => 301,
      knownParameterIds: new Set(['cfaa17bb']),
      targetCardName: () => 'x',
    });
    expect(plan.entries[0].changed).toBe(false);
    expect(plan.hasChanges).toBe(false);
  });

  it('flags a resized dashcard as changed', () => {
    const plan = planDashcards({
      sourceDashcards,
      targetDashcards: [{ id: 900, card_id: 301, row: 0, col: 0, size_x: 4, size_y: 3 }],
      resolveCardId: () => 301,
      knownParameterIds: new Set(['cfaa17bb']),
      targetCardName: () => 'x',
    });
    expect(plan.entries[0]).toMatchObject({ isNew: false, changed: true });
    expect(plan.hasChanges).toBe(true);
  });

  it('reports target dashcards the snapshot no longer contains', () => {
    const plan = planDashcards({
      sourceDashcards: [],
      targetDashcards: [{ id: 900, card_id: 301 }],
      resolveCardId: () => null,
      knownParameterIds: new Set(),
      targetCardName: () => 'Carte supprimée',
    });
    expect(plan.removed).toEqual([{ dashcardId: 900, cardId: 301, name: 'Carte supprimée' }]);
  });

  it('drops filter mappings whose parameter the dashboard no longer declares', () => {
    const plan = planDashcards({
      sourceDashcards,
      targetDashcards: [],
      resolveCardId: () => 301,
      knownParameterIds: new Set(),
      targetCardName: () => 'x',
    });
    expect(plan.entries[0].payload.parameter_mappings).toEqual([]);
    expect(plan.entries[0].droppedParameterMappings).toEqual(['cfaa17bb']);
    expect(plan.warnings).toHaveLength(1);
  });

  it('retargets the parameter mappings onto the target card id', () => {
    const plan = planDashcards({
      sourceDashcards,
      targetDashcards: [],
      resolveCardId: () => 301,
      knownParameterIds: new Set(['cfaa17bb']),
      targetCardName: () => 'x',
    });
    expect(plan.entries[0].payload.parameter_mappings).toEqual([
      { card_id: 301, parameter_id: 'cfaa17bb', target: ['variable', ['template-tag', 'x']] },
    ]);
  });
});

describe('planParameters', () => {
  const startDate: JsonObject = { id: '4e8d9288', name: 'start_date', slug: 'start_date', type: 'date/single' };
  const inclureEig: JsonObject = {
    id: 'e0aa9a5',
    name: 'inclure_eig',
    slug: 'inclure_eig',
    type: 'string/=',
    default: ['false'],
  };

  it('adds a filter the target does not declare yet', () => {
    const plan = planParameters({ sourceParameters: [startDate, inclureEig], targetParameters: [startDate] });

    expect(plan.entries.map((entry) => [entry.slug, entry.action])).toEqual([
      ['start_date', 'unchanged'],
      ['inclure_eig', 'create'],
    ]);
    expect(plan.parameters).toEqual([startDate, inclureEig]);
    expect(plan.hasChanges).toBe(true);
  });

  it('realigns an existing filter whose configuration drifted, and lists what changed', () => {
    const plan = planParameters({
      sourceParameters: [inclureEig],
      targetParameters: [{ ...inclureEig, default: ['true'], isMultiSelect: true }],
    });

    expect(plan.entries[0]).toMatchObject({ action: 'update', changedFields: ['default', 'isMultiSelect'] });
    expect(plan.parameters[0]).toEqual(inclureEig);
  });

  it("keeps the target's filter id and reports the remap, so anything mapped on it survives", () => {
    const plan = planParameters({
      sourceParameters: [startDate],
      targetParameters: [{ ...startDate, id: 'aa11bb22' }],
    });

    expect(plan.entries[0]).toMatchObject({ action: 'unchanged', sourceId: '4e8d9288', targetId: 'aa11bb22' });
    expect(plan.parameters[0]).toMatchObject({ id: 'aa11bb22', slug: 'start_date' });
    expect(plan.idRemap.get('4e8d9288')).toBe('aa11bb22');
  });

  it('matches on the id when the slug was renamed on the target', () => {
    const plan = planParameters({
      sourceParameters: [startDate],
      targetParameters: [{ ...startDate, slug: 'date_debut', name: 'date_debut' }],
    });

    expect(plan.entries[0]).toMatchObject({ action: 'update', targetId: '4e8d9288' });
    expect(plan.entries[0].changedFields).toEqual(['name', 'slug']);
  });

  it('drops a target filter the snapshot no longer declares', () => {
    const plan = planParameters({ sourceParameters: [startDate], targetParameters: [startDate, inclureEig] });

    expect(plan.entries.filter((entry) => entry.action === 'remove')).toMatchObject([{ slug: 'inclure_eig' }]);
    expect(plan.parameters).toEqual([startDate]);
  });

  it('reports no change when the target already matches the snapshot', () => {
    const plan = planParameters({
      sourceParameters: [startDate, inclureEig],
      targetParameters: [startDate, inclureEig],
    });

    expect(plan.hasChanges).toBe(false);
    expect(plan.idRemap.size).toBe(0);
  });

  it('warns instead of matching twice when the target declares a duplicate slug', () => {
    const plan = planParameters({
      sourceParameters: [startDate],
      targetParameters: [startDate, { ...startDate, id: 'duplicate' }],
    });

    expect(plan.warnings).toHaveLength(1);
    expect(plan.entries.map((entry) => entry.action)).toEqual(['unchanged', 'remove']);
  });
});

describe('planDashcards filter remapping', () => {
  const sourceDashcards: JsonObject[] = [
    {
      id: 42,
      card_id: 45,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      inline_parameters: ['4e8d9288'],
      parameter_mappings: [{ card_id: 45, parameter_id: '4e8d9288', target: ['variable', ['template-tag', 'x']] }],
    },
  ];

  it("rewrites the mappings onto the target's filter ids", () => {
    const plan = planDashcards({
      sourceDashcards,
      targetDashcards: [],
      resolveCardId: () => 301,
      knownParameterIds: new Set(['aa11bb22']),
      parameterIdRemap: new Map([['4e8d9288', 'aa11bb22']]),
      targetCardName: () => 'x',
    });

    expect(plan.entries[0].payload.parameter_mappings).toEqual([
      { card_id: 301, parameter_id: 'aa11bb22', target: ['variable', ['template-tag', 'x']] },
    ]);
    expect(plan.entries[0].payload.inline_parameters).toEqual(['aa11bb22']);
  });
});

describe('completeParametersFromCards', () => {
  const dropdownOnCard: JsonObject = {
    slug: 'lieu_de_survenue',
    type: 'string/=',
    isMultiSelect: true,
    values_query_type: 'list',
    values_source_type: 'static-list',
    values_source_config: { values: [['DOMICILE', 'Domicile']] },
  };

  it('fills the dropdown and multi-value settings the dashboard filter omits', () => {
    const { parameters, completions } = completeParametersFromCards({
      parameters: [
        {
          id: 'e0aa9a5',
          slug: 'lieu_de_survenue',
          type: 'string/=',
          values_source_type: 'static-list',
          values_source_config: { values: [['DOMICILE', 'Domicile']] },
        },
      ],
      cardParameters: [[dropdownOnCard]],
    });

    expect(parameters[0]).toMatchObject({ values_query_type: 'list', isMultiSelect: true });
    expect(completions).toEqual([{ slug: 'lieu_de_survenue', fields: ['values_query_type', 'isMultiSelect'] }]);
  });

  it('leaves a filter the dashboard already configures alone', () => {
    const parameter: JsonObject = { ...dropdownOnCard, id: 'ebea7d6e', isMultiSelect: false };
    const { parameters, completions } = completeParametersFromCards({
      parameters: [parameter],
      cardParameters: [[dropdownOnCard]],
    });

    expect(parameters[0]).toEqual(parameter);
    expect(completions).toEqual([]);
  });

  it('leaves date and boolean filters alone, since the cards declare no values source', () => {
    const startDate: JsonObject = { id: '4e8d9288', slug: 'start_date', type: 'date/single' };
    const { parameters, completions } = completeParametersFromCards({
      parameters: [startDate],
      cardParameters: [[{ slug: 'start_date', type: 'date/single', isMultiSelect: false }]],
    });

    expect(parameters[0]).toEqual(startDate);
    expect(completions).toEqual([]);
  });

  it('does not guess when the cards disagree on a setting', () => {
    const { parameters, completions } = completeParametersFromCards({
      parameters: [{ id: 'e0aa9a5', slug: 'lieu_de_survenue', values_source_type: 'static-list' }],
      cardParameters: [[dropdownOnCard], [{ ...dropdownOnCard, isMultiSelect: false }]],
    });

    expect(parameters[0]).not.toHaveProperty('isMultiSelect');
    expect(completions).toEqual([{ slug: 'lieu_de_survenue', fields: ['values_query_type', 'values_source_config'] }]);
  });
});

describe('planValuesSourceCards', () => {
  const entityLabel: JsonObject = {
    slug: 'entity_label',
    values_source_type: 'card',
    values_source_config: { card_id: 46 },
  };

  it("reuses the target's own card when it already feeds that filter", () => {
    const plan = planValuesSourceCards({
      parameters: [entityLabel],
      targetParametersBySlug: new Map([
        ['entity_label', { slug: 'entity_label', values_source_config: { card_id: 91 } }],
      ]),
      gridCardIds: new Set(),
    });

    expect([...plan.reuse]).toEqual([[46, 91]]);
    expect(plan.create).toEqual([]);
  });

  it('creates the card when the target configures nothing for that filter', () => {
    const plan = planValuesSourceCards({
      parameters: [entityLabel],
      targetParametersBySlug: new Map(),
      gridCardIds: new Set(),
    });

    expect(plan.reuse.size).toBe(0);
    expect(plan.create).toEqual([46]);
  });

  it('ignores a card that is already on the grid, restored like any other', () => {
    const plan = planValuesSourceCards({
      parameters: [entityLabel],
      targetParametersBySlug: new Map(),
      gridCardIds: new Set([46]),
    });

    expect(plan.reuse.size).toBe(0);
    expect(plan.create).toEqual([]);
  });
});

describe('remapValuesSources pending cards', () => {
  const parameters = [{ slug: 'entity_label', values_source_type: 'card', values_source_config: { card_id: 46 } }];

  it('leaves a values source alone when its card is still to be created', () => {
    const result = remapValuesSources({
      parameters,
      resolveCardId: () => null,
      pendingCardIds: new Set([46]),
      targetParametersBySlug: new Map(),
      allowUnresolved: false,
      label: 'dashboard 4',
    });

    expect(result.errors).toEqual([]);
    expect((result.parameters[0] as JsonObject).values_source_config).toMatchObject({ card_id: 46 });
  });

  it('still refuses a values source that exists nowhere', () => {
    const result = remapValuesSources({
      parameters,
      resolveCardId: () => null,
      pendingCardIds: new Set(),
      targetParametersBySlug: new Map(),
      allowUnresolved: false,
      label: 'dashboard 4',
    });

    expect(result.errors).toHaveLength(1);
  });
});
