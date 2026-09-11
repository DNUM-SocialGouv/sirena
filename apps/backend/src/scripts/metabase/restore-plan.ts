import type { Options } from './cli.js';
import { isEntityId } from './client.js';
import {
  type CardPlan,
  completeParametersFromCards,
  type DashcardPlan,
  type ParameterPlan,
  parametersBySlug,
  planCard,
  planDashcards,
  planParameters,
  remapValuesSources,
} from './plan.js';
import { type DashboardSnapshot, getDashcards, isDeepEqual, isObject, type JsonObject } from './snapshot.js';
import { UserError } from './user-error.js';

export function resolveDatabaseId(
  options: Options,
  targetCards: Map<number, JsonObject>,
  snapshot: DashboardSnapshot,
): number {
  if (options.databaseId !== undefined) return options.databaseId;

  const databases = new Set<number>();
  for (const card of targetCards.values()) {
    if (typeof card.database_id === 'number') databases.add(card.database_id);
  }

  if (databases.size === 1) return [...databases][0];
  if (databases.size === 0) {
    const snapshotDatabases = new Set(
      [...snapshot.cards.values()]
        .map((card) => (isObject(card.dataset_query) ? card.dataset_query.database : undefined))
        .filter(isEntityId),
    );
    throw new UserError(
      `Target dashboard ${options.target} has no card to infer the data source from. Pass --database-id <id> ` +
        `(the snapshot was taken against database ${[...snapshotDatabases].join(', ') || 'unknown'}).`,
    );
  }
  throw new UserError(
    `Target dashboard ${options.target} mixes several data sources (${[...databases].join(', ')}). ` +
      'Pass --database-id <id> to say which one new cards must use.',
  );
}

export type Plan = {
  cardPlans: CardPlan[];
  dashcardPlan: DashcardPlan;
  dashboardPayload: JsonObject;
  dashboardChangedFields: string[];
  parameterPlan: ParameterPlan;
  parameters: unknown[];
  warnings: string[];
  errors: string[];
};

export type PlanContext = {
  options: Options;
  snapshot: DashboardSnapshot;
  targetDashboard: JsonObject;

  plannedCards: JsonObject[];
  targetCards: Map<number, JsonObject>;
  idMap: Map<number, number>;
  matchedBy: Map<number, CardPlan['matchedBy']>;
  databaseId: number;
};

export function buildPlan(ctx: PlanContext): Plan {
  const { options, snapshot, targetDashboard, plannedCards, targetCards, idMap, matchedBy, databaseId } = ctx;
  const warnings: string[] = [];
  const errors: string[] = [];

  const resolveCardId = (sourceCardId: number): number | null => idMap.get(sourceCardId) ?? null;
  const pendingCardIds = new Set(
    plannedCards.map((card) => card.id).filter((id): id is number => typeof id === 'number' && !idMap.has(id)),
  );

  const targetDashboardParams = parametersBySlug(targetDashboard.parameters);

  const cardPlans = [...plannedCards]
    .sort((a, b) => (a.id as number) - (b.id as number))
    .map((source) => {
      const targetId = idMap.get(source.id as number) ?? null;
      const target = targetId === null ? null : (targetCards.get(targetId) ?? null);

      const targetCardParams = parametersBySlug(target?.parameters);

      const plan = planCard({
        source,
        target,
        matchedBy: matchedBy.get(source.id as number) ?? null,

        databaseId: target && typeof target.database_id === 'number' ? target.database_id : databaseId,
        remapParameters: (parameters, label) =>
          remapValuesSources({
            parameters,
            resolveCardId,
            pendingCardIds,
            targetParametersBySlug: targetCardParams,
            allowUnresolved: options.allowUnresolvedValuesSource,
            label,
          }),
      });
      warnings.push(...plan.warnings);
      errors.push(...plan.errors);
      return plan;
    });

  const completed = completeParametersFromCards({
    parameters: snapshot.dashboard.parameters,
    cardParameters: [...snapshot.cards.values()].map((card) => card.parameters),
  });
  for (const completion of completed.completions) {
    warnings.push(
      `Filter "${completion.slug}": ${completion.fields.join(', ')} taken from the cards — the snapshot's ` +
        'dashboard filter does not carry them',
    );
  }

  const dashboardParameters = remapValuesSources({
    parameters: completed.parameters,
    resolveCardId,
    pendingCardIds,
    targetParametersBySlug: targetDashboardParams,
    allowUnresolved: options.allowUnresolvedValuesSource,
    label: `dashboard ${snapshot.dashboardId}`,
  });
  warnings.push(...dashboardParameters.warnings);
  errors.push(...dashboardParameters.errors);

  const parameterPlan = planParameters({
    sourceParameters: dashboardParameters.parameters,
    targetParameters: targetDashboard.parameters,
  });
  warnings.push(...parameterPlan.warnings);

  const knownParameterIds = new Set<string>();
  const declaredSlugs = new Set<string>();
  for (const parameter of parameterPlan.parameters) {
    if (typeof parameter.id === 'string') knownParameterIds.add(parameter.id);
    if (typeof parameter.slug === 'string') declaredSlugs.add(parameter.slug);
  }

  const dashcardPlan = planDashcards({
    sourceDashcards: getDashcards(snapshot.dashboard),
    targetDashcards: getDashcards(targetDashboard),
    resolveCardId,
    knownParameterIds,
    parameterIdRemap: parameterPlan.idRemap,
    targetCardName: (cardId) => {
      const name = targetCards.get(cardId)?.name;
      return typeof name === 'string' ? name : `card ${cardId}`;
    },
  });
  warnings.push(...dashcardPlan.warnings);
  errors.push(...dashcardPlan.errors);

  const embeddingParams = isObject(snapshot.dashboard.embedding_params) ? snapshot.dashboard.embedding_params : null;
  if (embeddingParams) {
    const unknown = Object.keys(embeddingParams).filter((slug) => !declaredSlugs.has(slug));
    if (unknown.length > 0) {
      errors.push(
        `Snapshot inconsistency: embedding_params declares ${unknown.map((s) => `"${s}"`).join(', ')} but the ` +
          'dashboard has no such filter. Re-run the export.',
      );
    }
  }

  const dashboardPayload: JsonObject = {
    parameters: parameterPlan.parameters,
    enable_embedding: snapshot.dashboard.enable_embedding ?? false,
    embedding_params: embeddingParams,
    auto_apply_filters: snapshot.dashboard.auto_apply_filters ?? true,
    width: snapshot.dashboard.width ?? 'fixed',
    archived: false,
  };

  if ('embedding_type' in targetDashboard) {
    dashboardPayload.embedding_type = snapshot.dashboard.embedding_type ?? null;
  }
  if (options.overwriteName) {
    dashboardPayload.name = snapshot.dashboard.name;
    dashboardPayload.description = snapshot.dashboard.description ?? null;
  }

  const dashboardChangedFields = Object.keys(dashboardPayload).filter(
    (field) => !isDeepEqual(dashboardPayload[field], targetDashboard[field]),
  );
  if (dashcardPlan.hasChanges) dashboardChangedFields.push('dashcards');

  return {
    cardPlans,
    dashcardPlan,
    dashboardPayload,
    dashboardChangedFields,
    parameterPlan,
    parameters: parameterPlan.parameters,
    warnings: [...new Set(warnings)],
    errors: [...new Set(errors)],
  };
}
