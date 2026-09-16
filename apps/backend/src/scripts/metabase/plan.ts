import { isEntityId } from './client.js';
import { isDeepEqual, isObject, type JsonObject } from './snapshot.js';

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

  ambiguities: { name: string; targetIds: number[] }[];
  errors: string[];
};

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
  const { targetCards, explicitMapping = new Map() } = input;
  const errors: string[] = [];
  const ambiguities: { name: string; targetIds: number[] }[] = [];

  const sourceCards = [...input.sourceCards].sort((a, b) => (a.id as number) - (b.id as number));

  const targetById = new Map<number, JsonObject>();
  for (const card of targetCards) {
    if (isEntityId(card.id)) targetById.set(card.id, card);
  }

  const byExactName = new Map<string, number[]>();
  const byNormalizedName = new Map<string, number[]>();
  for (const card of targetCards) {
    if (!isEntityId(card.id) || typeof card.name !== 'string') continue;
    byExactName.set(card.name, [...(byExactName.get(card.name) ?? []), card.id]);
    const key = normalizeName(card.name);
    byNormalizedName.set(key, [...(byNormalizedName.get(key) ?? []), card.id]);
  }

  const sourceNameCounts = new Map<string, number>();
  for (const card of sourceCards) {
    if (typeof card.name !== 'string') continue;
    const key = normalizeName(card.name);
    sourceNameCounts.set(key, (sourceNameCounts.get(key) ?? 0) + 1);
  }
  for (const [name, count] of sourceNameCounts) {
    if (count > 1) {
      errors.push(
        `The snapshot has ${count} cards named "${name}" (ignoring case and accents). Cards are matched by ` +
          'name, so rename them in the source dashboard and re-run the export.',
      );
    }
  }

  const claimed = new Set<number>();
  const matches = new Map<number, CardMatch>();
  const nameOf = (card: JsonObject): string =>
    typeof card.name === 'string' ? card.name : `card ${card.id as number}`;

  for (const [sourceId, targetId] of explicitMapping) {
    if (!targetById.has(targetId)) {
      errors.push(`Mapping ${sourceId} → ${targetId}: card ${targetId} is not attached to the target dashboard`);
      continue;
    }
    claimed.add(targetId);
  }

  const unmatched: JsonObject[] = [];
  for (const source of sourceCards) {
    const sourceId = source.id as number;
    const explicit = explicitMapping.get(sourceId);
    if (explicit !== undefined && targetById.has(explicit)) {
      matches.set(sourceId, {
        sourceId,
        sourceName: nameOf(source),
        targetId: explicit,
        matchedBy: 'explicit-mapping',
      });
      continue;
    }
    unmatched.push(source);
  }

  const claimByName = (
    cards: JsonObject[],
    index: Map<string, number[]>,
    key: (name: string) => string,
    matchedBy: MatchKind,
  ): JsonObject[] => {
    const leftovers: JsonObject[] = [];
    for (const source of cards) {
      const sourceId = source.id as number;
      const name = nameOf(source);
      const candidates = (index.get(key(name)) ?? []).filter((id) => !claimed.has(id));
      if (candidates.length > 1) {
        ambiguities.push({ name, targetIds: candidates });
        matches.set(sourceId, { sourceId, sourceName: name, targetId: null, matchedBy: null });
        continue;
      }
      if (candidates.length === 1) {
        claimed.add(candidates[0]);
        matches.set(sourceId, { sourceId, sourceName: name, targetId: candidates[0], matchedBy });
        continue;
      }
      leftovers.push(source);
    }
    return leftovers;
  };

  const afterExact = claimByName(unmatched, byExactName, (name) => name, 'name');
  for (const source of claimByName(afterExact, byNormalizedName, normalizeName, 'normalized-name')) {
    const sourceId = source.id as number;
    matches.set(sourceId, { sourceId, sourceName: nameOf(source), targetId: null, matchedBy: null });
  }

  return { matches: sourceCards.map((card) => matches.get(card.id as number) as CardMatch), ambiguities, errors };
}

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

export function remapValuesSources(input: {
  parameters: unknown;
  resolveCardId: (sourceCardId: number) => number | null;

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

    if (pendingCardIds?.has(sourceCardId)) return parameter;

    const targetConfig = targetParametersBySlug.get(slug)?.values_source_config;
    if (isObject(targetConfig) && typeof targetConfig.card_id === 'number') {
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

    const {
      values_source_config: _config,
      values_source_type: _type,
      values_query_type: _queryType,
      ...rest
    } = parameter;
    return rest;
  });

  return { parameters: remapped, warnings, errors };
}

const parameterSlug = (parameter: JsonObject): string => (typeof parameter.slug === 'string' ? parameter.slug : '');

export function parametersBySlug(value: unknown): Map<string, JsonObject> {
  const bySlug = new Map<string, JsonObject>();
  for (const parameter of (Array.isArray(value) ? value : []).filter(isObject)) {
    const slug = parameterSlug(parameter);
    if (slug) bySlug.set(slug, parameter);
  }
  return bySlug;
}

export const WIDGET_PARAMETER_FIELDS = [
  'values_query_type',
  'values_source_type',
  'values_source_config',
  'isMultiSelect',
] as const;

export type ParameterCompletion = { slug: string; fields: string[] };

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

    if (!candidates.some((candidate) => Boolean(candidate.values_source_type))) return parameter;

    const filled: JsonObject = { ...parameter };
    const fields: string[] = [];
    for (const field of WIDGET_PARAMETER_FIELDS) {
      if (field in parameter) continue;
      const declared = candidates.filter((candidate) => field in candidate).map((candidate) => candidate[field]);
      const [value] = declared;

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

  sourceId: string | null;

  targetId: string | null;
  changedFields: string[];
};

export type ParameterPlan = {
  entries: ParameterPlanEntry[];

  parameters: JsonObject[];

  idRemap: Map<string, string>;
  hasChanges: boolean;
  warnings: string[];
};

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
  reuse: Map<number, number>;

  create: number[];
};

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
  id: number;
  isNew: boolean;

  changed: boolean;
  sourceCardId: number | null;

  cardId: number | null;
  payload: JsonObject;
  droppedParameterMappings: string[];
};

export type DashcardPlan = {
  entries: DashcardPlanEntry[];
  removed: { dashcardId: number; cardId: number | null; name: string }[];

  hasChanges: boolean;
  warnings: string[];
  errors: string[];
};

const ROW_STRIDE = 1000;
const dashcardPosition = (dashcard: JsonObject): number =>
  (typeof dashcard.row === 'number' ? dashcard.row : 0) * ROW_STRIDE +
  (typeof dashcard.col === 'number' ? dashcard.col : 0);

export function planDashcards(input: {
  sourceDashcards: JsonObject[];
  targetDashcards: JsonObject[];
  resolveCardId: (sourceCardId: number) => number | null;
  knownParameterIds: Set<string>;
  targetCardName: (cardId: number) => string;

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
  const errors: string[] = [];

  const sortedTargets = [...targetDashcards].sort((a, b) => dashcardPosition(a) - dashcardPosition(b));
  const available = new Map<number, JsonObject[]>();

  const availableVirtual: JsonObject[] = [];
  for (const dashcard of sortedTargets) {
    if (typeof dashcard.card_id !== 'number') {
      availableVirtual.push(dashcard);
      continue;
    }
    available.set(dashcard.card_id, [...(available.get(dashcard.card_id) ?? []), dashcard]);
  }

  const takeVirtual = (dashcard: JsonObject): JsonObject | undefined => {
    const position = dashcardPosition(dashcard);
    const samePosition = availableVirtual.findIndex((candidate) => dashcardPosition(candidate) === position);
    const index = samePosition === -1 ? 0 : samePosition;
    return availableVirtual.splice(index, 1)[0];
  };

  const targetDashcardKeys = new Set(sortedTargets.flatMap((dashcard) => Object.keys(dashcard)));
  const targetSupports = (key: string): boolean => targetDashcardKeys.size === 0 || targetDashcardKeys.has(key);

  const reusedDashcardIds = new Set<number>();
  const entries: DashcardPlanEntry[] = [];
  let nextPlaceholderId = -1;

  for (const dashcard of [...sourceDashcards].sort((a, b) => dashcardPosition(a) - dashcardPosition(b))) {
    const sourceCardId = typeof dashcard.card_id === 'number' ? dashcard.card_id : null;
    const cardId = sourceCardId === null ? null : resolveCardId(sourceCardId);

    const reusable =
      sourceCardId === null ? takeVirtual(dashcard) : cardId === null ? undefined : available.get(cardId)?.shift();
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
      .map((serie) => {
        if (typeof serie.id !== 'number') return serie;
        const resolved = resolveCardId(serie.id);
        if (resolved === null) {
          errors.push(
            `Dashcard for card ${String(sourceCardId)}: extra series card ${serie.id} resolves to nothing on the ` +
              'target. Re-run the export to capture it, or map it with --mapping.',
          );
          return null;
        }
        return { id: resolved };
      })
      .filter((serie) => serie !== null);

    const payload: JsonObject = {
      card_id: cardId,
      row: dashcard.row,
      col: dashcard.col,
      size_x: dashcard.size_x,
      size_y: dashcard.size_y,
      series,
      parameter_mappings: parameterMappings,
      visualization_settings: dashcard.visualization_settings ?? {},
    };
    if (targetSupports('action_id')) payload.action_id = dashcard.action_id ?? null;
    if (targetSupports('dashboard_tab_id')) payload.dashboard_tab_id = null;
    if (targetSupports('inline_parameters')) {
      payload.inline_parameters = (Array.isArray(dashcard.inline_parameters) ? dashcard.inline_parameters : []).map(
        (parameterId) => (typeof parameterId === 'string' ? resolveParameterId(parameterId) : parameterId),
      );
    }

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
  return { entries, removed, hasChanges, warnings, errors };
}
