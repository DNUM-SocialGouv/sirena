/**
 * Pure planning layer of the Metabase restore: given a repo snapshot and the current
 * state of the target dashboard, decide what to create, update, keep and remove.
 *
 * No IO here on purpose — this is the part covered by unit tests.
 */

import { isDeepEqual, isObject, type JsonObject } from './snapshot.js';

/** Card fields the restore keeps in sync. Everything else belongs to the target instance. */
export const SYNCED_CARD_FIELDS = [
  'name',
  'description',
  'display',
  'type',
  'dataset_query',
  'visualization_settings',
  'parameters',
  'archived',
] as const;

/** Dashboard fields the restore keeps in sync (name/description are opt-in, see planDashboard). */
export const SYNCED_DASHBOARD_FIELDS = [
  'parameters',
  'enable_embedding',
  'embedding_params',
  'auto_apply_filters',
  'width',
  'archived',
] as const;

export type MatchKind = 'explicit-mapping' | 'name' | 'normalized-name';

export type CardMatch = {
  sourceId: number;
  sourceName: string;
  targetId: number | null;
  matchedBy: MatchKind | null;
};

export type CardMatchResult = {
  matches: CardMatch[];
  /** Several target cards share the same name: refuse to guess. */
  ambiguities: { name: string; targetIds: number[] }[];
  errors: string[];
};

/** Case/accent/whitespace-insensitive name key, so a stray accent fix does not fork a card. */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function matchCards(input: {
  sourceCards: JsonObject[];
  targetCards: JsonObject[];
  explicitMapping?: Map<number, number>;
}): CardMatchResult {
  const { sourceCards, targetCards, explicitMapping = new Map() } = input;
  const errors: string[] = [];
  const ambiguities: { name: string; targetIds: number[] }[] = [];

  const targetById = new Map<number, JsonObject>();
  for (const card of targetCards) {
    if (typeof card.id === 'number') targetById.set(card.id, card);
  }

  const byExactName = new Map<string, number[]>();
  const byNormalizedName = new Map<string, number[]>();
  for (const card of targetCards) {
    if (typeof card.id !== 'number' || typeof card.name !== 'string') continue;
    byExactName.set(card.name, [...(byExactName.get(card.name) ?? []), card.id]);
    const key = normalizeName(card.name);
    byNormalizedName.set(key, [...(byNormalizedName.get(key) ?? []), card.id]);
  }

  const claimed = new Set<number>();
  const matches: CardMatch[] = [];

  // Explicit mappings win and are consumed first, so they cannot be stolen by a name match.
  for (const [sourceId, targetId] of explicitMapping) {
    if (!targetById.has(targetId)) {
      errors.push(`Mapping ${sourceId} → ${targetId}: card ${targetId} is not attached to the target dashboard`);
      continue;
    }
    claimed.add(targetId);
  }

  for (const source of sourceCards) {
    const sourceId = source.id as number;
    const sourceName = typeof source.name === 'string' ? source.name : `card ${sourceId}`;

    const explicit = explicitMapping.get(sourceId);
    if (explicit !== undefined && targetById.has(explicit)) {
      matches.push({ sourceId, sourceName, targetId: explicit, matchedBy: 'explicit-mapping' });
      continue;
    }

    const exact = (byExactName.get(sourceName) ?? []).filter((id) => !claimed.has(id));
    if (exact.length > 1) {
      ambiguities.push({ name: sourceName, targetIds: exact });
      matches.push({ sourceId, sourceName, targetId: null, matchedBy: null });
      continue;
    }
    if (exact.length === 1) {
      claimed.add(exact[0]);
      matches.push({ sourceId, sourceName, targetId: exact[0], matchedBy: 'name' });
      continue;
    }

    const loose = (byNormalizedName.get(normalizeName(sourceName)) ?? []).filter((id) => !claimed.has(id));
    if (loose.length > 1) {
      ambiguities.push({ name: sourceName, targetIds: loose });
      matches.push({ sourceId, sourceName, targetId: null, matchedBy: null });
      continue;
    }
    if (loose.length === 1) {
      claimed.add(loose[0]);
      matches.push({ sourceId, sourceName, targetId: loose[0], matchedBy: 'normalized-name' });
      continue;
    }

    matches.push({ sourceId, sourceName, targetId: null, matchedBy: null });
  }

  return { matches, ambiguities, errors };
}

/**
 * True when a query points at physical tables/fields by numeric id. Those ids belong to a
 * single Metabase database, so such a card cannot be retargeted to another database.
 */
export function referencesPhysicalSchema(datasetQuery: unknown): boolean {
  let found = false;
  const walk = (node: unknown): void => {
    if (found) return;
    if (Array.isArray(node)) {
      if (node[0] === 'field' && typeof node[1] === 'number') {
        found = true;
        return;
      }
      for (const item of node) walk(item);
      return;
    }
    if (!isObject(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if ((key === 'source-table' || key === 'table-id') && typeof child === 'number') {
        found = true;
        return;
      }
      walk(child);
    }
  };
  walk(datasetQuery);
  return found;
}

export type ValuesSourceResolution = {
  parameters: unknown[];
  warnings: string[];
  errors: string[];
};

/**
 * Rewrites `values_source_config.card_id` (the card feeding a filter dropdown) so it points
 * at the target instance. Order: explicit id map → value already configured on the target for
 * the same filter slug → give up.
 */
export function remapValuesSources(input: {
  parameters: unknown;
  resolveCardId: (sourceCardId: number) => number | null;
  /** Snapshot cards not on the target yet: they are created first, then resolved on the second pass. */
  pendingCardIds?: Set<number>;
  targetParametersBySlug: Map<string, JsonObject>;
  allowUnresolved: boolean;
  label: string;
}): ValuesSourceResolution {
  const { parameters, resolveCardId, pendingCardIds, targetParametersBySlug, allowUnresolved, label } = input;
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!Array.isArray(parameters)) return { parameters: [], warnings, errors };

  const remapped = parameters.map((parameter) => {
    if (!isObject(parameter)) return parameter;
    const config = parameter.values_source_config;
    if (!isObject(config) || typeof config.card_id !== 'number') return parameter;

    const slug = typeof parameter.slug === 'string' ? parameter.slug : '';
    const sourceCardId = config.card_id;

    const mapped = resolveCardId(sourceCardId);
    if (mapped !== null) {
      return { ...parameter, values_source_config: { ...config, card_id: mapped } };
    }

    // The card is in the snapshot but not on the target yet: it is created before the dashboard
    // is written, and the id resolves when the plan is rebuilt.
    if (pendingCardIds?.has(sourceCardId)) return parameter;

    const targetConfig = targetParametersBySlug.get(slug)?.values_source_config;
    if (isObject(targetConfig) && typeof targetConfig.card_id === 'number') {
      // Label-free on purpose: every card repeats the same filter, and the caller de-duplicates.
      warnings.push(
        `Filter "${slug}": values-source card ${sourceCardId} is absent from the snapshot — ` +
          `keeping the target's card ${targetConfig.card_id}`,
      );
      return { ...parameter, values_source_config: { ...config, card_id: targetConfig.card_id } };
    }

    if (!allowUnresolved) {
      errors.push(
        `${label}: filter "${slug}" sources its values from card ${sourceCardId}, which exists neither in the ` +
          'snapshot nor on the target. Re-run the export to capture it, map it with --mapping, or pass ' +
          '--allow-unresolved-values-source to fall back to a free-text filter.',
      );
      return parameter;
    }

    warnings.push(`${label}: filter "${slug}" lost its values source (card ${sourceCardId} unresolved)`);
    const { values_source_config: _config, values_source_type: _type, ...rest } = parameter;
    return rest;
  });

  return { parameters: remapped, warnings, errors };
}

const parameterSlug = (parameter: JsonObject): string => (typeof parameter.slug === 'string' ? parameter.slug : '');

/**
 * Widget settings Metabase stores twice: on the dashboard filter, and on every card parameter
 * the filter is mapped to. They are what the UI calls "How should people filter on this column?"
 * (dropdown list and its values) and "People can pick one/multiple values".
 */
export const WIDGET_PARAMETER_FIELDS = [
  'values_query_type',
  'values_source_type',
  'values_source_config',
  'isMultiSelect',
] as const;

export type ParameterCompletion = { slug: string; fields: string[] };

/**
 * Fills the widget settings a dropdown filter omits at dashboard level with what its cards declare.
 *
 * Metabase only writes them on the dashboard filter when it is configured from the dashboard;
 * a filter wired from the card's variable settings keeps them on the cards alone. Restoring the
 * dashboard filter as-is would then drop the target's own setting without asserting the
 * snapshot's, and a dropdown-with-values / multi-value filter would come back as a text box.
 */
export function completeParametersFromCards(input: { parameters: unknown; cardParameters: unknown[] }): {
  parameters: JsonObject[];
  completions: ParameterCompletion[];
} {
  const parameters = (Array.isArray(input.parameters) ? input.parameters : []).filter(isObject);

  const bySlug = new Map<string, JsonObject[]>();
  for (const cardParameters of input.cardParameters) {
    for (const parameter of (Array.isArray(cardParameters) ? cardParameters : []).filter(isObject)) {
      const slug = parameterSlug(parameter);
      if (!slug) continue;
      bySlug.set(slug, [...(bySlug.get(slug) ?? []), parameter]);
    }
  }

  const completions: ParameterCompletion[] = [];

  const completed = parameters.map((parameter) => {
    const candidates = bySlug.get(parameterSlug(parameter)) ?? [];
    // Only dropdown filters: a date or boolean filter has no widget config to inherit, and
    // copying the cards' `isMultiSelect: false` onto it would assert a setting Metabase itself
    // does not store on the dashboard.
    if (!candidates.some((candidate) => Boolean(candidate.values_source_type))) return parameter;

    const filled: JsonObject = { ...parameter };
    const fields: string[] = [];
    for (const field of WIDGET_PARAMETER_FIELDS) {
      if (field in parameter) continue;
      const declared = candidates.filter((candidate) => field in candidate).map((candidate) => candidate[field]);
      const [value] = declared;
      // Cards that disagree mean the filter is not uniformly wired: leave it to a human.
      if (declared.length === 0 || !declared.every((other) => isDeepEqual(other, value))) continue;
      filled[field] = value;
      fields.push(field);
    }

    if (fields.length === 0) return parameter;
    completions.push({ slug: parameterSlug(parameter), fields });
    return filled;
  });

  return { parameters: completed, completions };
}

export type ParameterAction = 'create' | 'update' | 'unchanged' | 'remove';

export type ParameterPlanEntry = {
  slug: string;
  name: string;
  action: ParameterAction;
  /** Filter id in the snapshot. */
  sourceId: string | null;
  /** Filter id on the target, kept when the filter already exists there. */
  targetId: string | null;
  changedFields: string[];
};

export type ParameterPlan = {
  entries: ParameterPlanEntry[];
  /** The `parameters` array to write on the target. */
  parameters: JsonObject[];
  /** Snapshot filter id → id actually written, for the dashcard mappings to follow. */
  idRemap: Map<string, string>;
  hasChanges: boolean;
  warnings: string[];
};

/**
 * Reconciles the dashboard filters: a filter missing from the target is added, an existing one
 * has its configuration realigned on the snapshot, and one the snapshot no longer declares is
 * dropped.
 *
 * Filters are matched by slug — that is what `embedding_params`, the embed URL and the backend
 * key on — falling back to the id. A matched filter keeps the target's id, so restoring twice
 * does not churn ids and anything already pointing at that filter keeps working; `idRemap` then
 * carries the snapshot id so the dashcard mappings can follow.
 */
export function planParameters(input: { sourceParameters: unknown; targetParameters: unknown }): ParameterPlan {
  const sourceParameters = (Array.isArray(input.sourceParameters) ? input.sourceParameters : []).filter(isObject);
  const targetParameters = (Array.isArray(input.targetParameters) ? input.targetParameters : []).filter(isObject);
  const warnings: string[] = [];

  const bySlug = new Map<string, JsonObject>();
  const byId = new Map<string, JsonObject>();
  for (const parameter of targetParameters) {
    const slug = parameterSlug(parameter);
    if (slug && bySlug.has(slug)) {
      warnings.push(`Target dashboard declares several filters with slug "${slug}" — keeping the first`);
    } else if (slug) {
      bySlug.set(slug, parameter);
    }
    if (typeof parameter.id === 'string') byId.set(parameter.id, parameter);
  }

  const claimed = new Set<JsonObject>();
  const entries: ParameterPlanEntry[] = [];
  const parameters: JsonObject[] = [];
  const idRemap = new Map<string, string>();

  for (const source of sourceParameters) {
    const slug = parameterSlug(source);
    const sourceId = typeof source.id === 'string' ? source.id : null;
    const name = typeof source.name === 'string' ? source.name : slug;

    const bySlugMatch = slug ? bySlug.get(slug) : undefined;
    const byIdMatch = sourceId ? byId.get(sourceId) : undefined;
    const target =
      bySlugMatch && !claimed.has(bySlugMatch) ? bySlugMatch : byIdMatch && !claimed.has(byIdMatch) ? byIdMatch : null;

    const targetId = target && typeof target.id === 'string' ? target.id : null;
    const payload: JsonObject = targetId === null ? { ...source } : { ...source, id: targetId };
    parameters.push(payload);

    if (!target) {
      entries.push({ slug, name, action: 'create', sourceId, targetId: null, changedFields: [] });
      continue;
    }

    claimed.add(target);
    if (sourceId !== null && targetId !== null && sourceId !== targetId) idRemap.set(sourceId, targetId);

    const changedFields = [...new Set([...Object.keys(payload), ...Object.keys(target)])]
      .filter((field) => field !== 'id')
      .filter((field) => !isDeepEqual(payload[field], target[field]))
      .sort();

    entries.push({
      slug,
      name,
      action: changedFields.length === 0 ? 'unchanged' : 'update',
      sourceId,
      targetId,
      changedFields,
    });
  }

  for (const orphan of targetParameters) {
    if (claimed.has(orphan)) continue;
    const slug = parameterSlug(orphan);
    entries.push({
      slug,
      name: typeof orphan.name === 'string' ? orphan.name : slug,
      action: 'remove',
      sourceId: null,
      targetId: typeof orphan.id === 'string' ? orphan.id : null,
      changedFields: [],
    });
  }

  return {
    entries,
    parameters,
    idRemap,
    hasChanges: entries.some((entry) => entry.action !== 'unchanged'),
    warnings,
  };
}

export type ValuesSourceCardPlan = {
  /** Snapshot card id → the target's own card, which must be reused untouched. */
  reuse: Map<number, number>;
  /** Snapshot card ids the target has nothing for: they have to be created there. */
  create: number[];
};

/**
 * Decides what to do with the cards feeding a filter dropdown (`values_source_type: "card"`).
 *
 * They are not on the grid, so they are not restored like the other cards: when the target
 * already points its own card at that filter, that card is reused as is — it is the target's
 * data, usually even named after the target environment, and overwriting it with the snapshot's
 * would be wrong. Only a filter the target has nothing for gets its card created.
 */
export function planValuesSourceCards(input: {
  parameters: unknown;
  targetParametersBySlug: Map<string, JsonObject>;
  gridCardIds: Set<number>;
}): ValuesSourceCardPlan {
  const { targetParametersBySlug, gridCardIds } = input;
  const parameters = (Array.isArray(input.parameters) ? input.parameters : []).filter(isObject);

  const reuse = new Map<number, number>();
  const create = new Set<number>();

  for (const parameter of parameters) {
    const config = parameter.values_source_config;
    if (!isObject(config) || typeof config.card_id !== 'number') continue;
    if (gridCardIds.has(config.card_id)) continue;

    const targetConfig = targetParametersBySlug.get(parameterSlug(parameter))?.values_source_config;
    if (isObject(targetConfig) && typeof targetConfig.card_id === 'number') {
      reuse.set(config.card_id, targetConfig.card_id);
      continue;
    }
    create.add(config.card_id);
  }

  for (const id of reuse.keys()) create.delete(id);
  return { reuse, create: [...create].sort((a, b) => a - b) };
}

export type CardAction = 'create' | 'update' | 'unchanged';

export type CardPlan = {
  sourceId: number;
  targetId: number | null;
  name: string;
  action: CardAction;
  matchedBy: MatchKind | null;
  changedFields: string[];
  databaseId: number;
  payload: JsonObject;
  warnings: string[];
  errors: string[];
};

/**
 * Builds the payload for one card. The target's data source is preserved: only
 * `dataset_query.database` is rewritten, which is what Metabase derives `database_id` from.
 */
export function planCard(input: {
  source: JsonObject;
  target: JsonObject | null;
  matchedBy: MatchKind | null;
  databaseId: number;
  remapParameters: (parameters: unknown, label: string) => ValuesSourceResolution;
}): CardPlan {
  const { source, target, matchedBy, databaseId, remapParameters } = input;
  const sourceId = source.id as number;
  const name = typeof source.name === 'string' ? source.name : `card ${sourceId}`;
  const warnings: string[] = [];
  const errors: string[] = [];

  const sourceDatabase = isObject(source.dataset_query) ? source.dataset_query.database : undefined;
  if (sourceDatabase !== databaseId && referencesPhysicalSchema(source.dataset_query)) {
    errors.push(
      `Card "${name}" (${sourceId}) is a GUI question referencing tables/fields of database ${String(sourceDatabase)} ` +
        `by id; it cannot be retargeted to database ${databaseId}. Rewrite it as a native query, or restore it manually.`,
    );
  }

  const datasetQuery = isObject(source.dataset_query) ? { ...source.dataset_query, database: databaseId } : null;

  const parameters = remapParameters(source.parameters, `card "${name}" (${sourceId})`);
  warnings.push(...parameters.warnings);
  errors.push(...parameters.errors);

  const payload: JsonObject = {
    name,
    description: source.description ?? null,
    display: source.display,
    type: source.type ?? 'question',
    dataset_query: datasetQuery,
    visualization_settings: source.visualization_settings ?? {},
    parameters: parameters.parameters,
    archived: false,
  };

  if (!target) {
    return {
      sourceId,
      targetId: null,
      name,
      action: 'create',
      matchedBy,
      changedFields: [...SYNCED_CARD_FIELDS],
      databaseId,
      payload,
      warnings,
      errors,
    };
  }

  const changedFields = SYNCED_CARD_FIELDS.filter((field) => !isDeepEqual(payload[field], target[field]));

  return {
    sourceId,
    targetId: target.id as number,
    name,
    action: changedFields.length === 0 ? 'unchanged' : 'update',
    matchedBy,
    changedFields,
    databaseId,
    payload,
    warnings,
    errors,
  };
}

export type DashcardPlanEntry = {
  /** Existing target dashcard id, or a negative placeholder that tells Metabase to create it. */
  id: number;
  isNew: boolean;
  /** True when the target dashcard exists but its position, size or mappings differ. */
  changed: boolean;
  sourceCardId: number | null;
  /** Null while the underlying card has yet to be created (dry-run only). */
  cardId: number | null;
  payload: JsonObject;
  droppedParameterMappings: string[];
};

export type DashcardPlan = {
  entries: DashcardPlanEntry[];
  removed: { dashcardId: number; cardId: number | null; name: string }[];
  /** False when the target grid is already exactly the planned one. */
  hasChanges: boolean;
  warnings: string[];
};

const DASHCARD_POSITION = (dashcard: JsonObject): number =>
  (typeof dashcard.row === 'number' ? dashcard.row : 0) * 1000 + (typeof dashcard.col === 'number' ? dashcard.col : 0);

/**
 * Rebuilds the dashcard grid from the snapshot, reusing the target's dashcard ids whenever
 * the underlying card already sits on the dashboard, so layout edits stay in place instead
 * of churning ids on every run.
 */
export function planDashcards(input: {
  sourceDashcards: JsonObject[];
  targetDashcards: JsonObject[];
  resolveCardId: (sourceCardId: number) => number | null;
  knownParameterIds: Set<string>;
  targetCardName: (cardId: number) => string;
  /** Snapshot filter id → id written on the target, see planParameters. */
  parameterIdRemap?: Map<string, string>;
}): DashcardPlan {
  const {
    sourceDashcards,
    targetDashcards,
    resolveCardId,
    knownParameterIds,
    targetCardName,
    parameterIdRemap = new Map<string, string>(),
  } = input;
  const resolveParameterId = (parameterId: string): string => parameterIdRemap.get(parameterId) ?? parameterId;
  const warnings: string[] = [];

  const available = new Map<number, JsonObject[]>();
  for (const dashcard of [...targetDashcards].sort((a, b) => DASHCARD_POSITION(a) - DASHCARD_POSITION(b))) {
    if (typeof dashcard.card_id !== 'number') continue;
    available.set(dashcard.card_id, [...(available.get(dashcard.card_id) ?? []), dashcard]);
  }

  const reusedDashcardIds = new Set<number>();
  const entries: DashcardPlanEntry[] = [];
  let nextPlaceholderId = -1;

  for (const dashcard of [...sourceDashcards].sort((a, b) => DASHCARD_POSITION(a) - DASHCARD_POSITION(b))) {
    const sourceCardId = typeof dashcard.card_id === 'number' ? dashcard.card_id : null;
    const cardId = sourceCardId === null ? null : resolveCardId(sourceCardId);

    const reusable = cardId === null ? undefined : available.get(cardId)?.shift();
    if (reusable && typeof reusable.id === 'number') reusedDashcardIds.add(reusable.id);

    const droppedParameterMappings: string[] = [];
    const parameterMappings = (Array.isArray(dashcard.parameter_mappings) ? dashcard.parameter_mappings : [])
      .filter(isObject)
      .map((mapping) =>
        typeof mapping.parameter_id === 'string'
          ? { ...mapping, parameter_id: resolveParameterId(mapping.parameter_id) }
          : mapping,
      )
      .filter((mapping) => {
        const parameterId = typeof mapping.parameter_id === 'string' ? mapping.parameter_id : '';
        if (knownParameterIds.has(parameterId)) return true;
        droppedParameterMappings.push(parameterId);
        return false;
      })
      .map((mapping) => ({ ...mapping, card_id: cardId }));

    const series = (Array.isArray(dashcard.series) ? dashcard.series : [])
      .filter(isObject)
      .map((serie) => (typeof serie.id === 'number' ? { id: resolveCardId(serie.id) } : serie));

    const payload: JsonObject = {
      card_id: cardId,
      action_id: dashcard.action_id ?? null,
      row: dashcard.row,
      col: dashcard.col,
      size_x: dashcard.size_x,
      size_y: dashcard.size_y,
      dashboard_tab_id: null,
      series,
      parameter_mappings: parameterMappings,
      visualization_settings: dashcard.visualization_settings ?? {},
      inline_parameters: (Array.isArray(dashcard.inline_parameters) ? dashcard.inline_parameters : []).map(
        (parameterId) => (typeof parameterId === 'string' ? resolveParameterId(parameterId) : parameterId),
      ),
    };

    entries.push({
      id: reusable && typeof reusable.id === 'number' ? reusable.id : nextPlaceholderId--,
      isNew: !reusable,
      changed: !reusable || Object.keys(payload).some((key) => !isDeepEqual(payload[key], reusable[key])),
      sourceCardId,
      cardId,
      droppedParameterMappings,
      payload,
    });

    if (droppedParameterMappings.length > 0) {
      warnings.push(
        `Dashcard for card ${String(sourceCardId)}: dropped ${droppedParameterMappings.length} filter mapping(s) ` +
          'pointing at a parameter the dashboard no longer declares',
      );
    }
  }

  const removed = targetDashcards
    .filter((dashcard) => typeof dashcard.id === 'number' && !reusedDashcardIds.has(dashcard.id))
    .map((dashcard) => ({
      dashcardId: dashcard.id as number,
      cardId: typeof dashcard.card_id === 'number' ? dashcard.card_id : null,
      name: typeof dashcard.card_id === 'number' ? targetCardName(dashcard.card_id) : '(no card)',
    }));

  const hasChanges = removed.length > 0 || entries.some((entry) => entry.changed);
  return { entries, removed, hasChanges, warnings };
}
