import type { StatisticsCard } from './statistics.types';

export const DASHBOARD_FILTER_KEYS = ['period', 'domaine', 'lieu', 'eig'] as const;
export type DashboardFilterKey = (typeof DASHBOARD_FILTER_KEYS)[number];

const FILTER_SLUGS: Record<DashboardFilterKey, readonly string[]> = {
  period: ['start_date', 'end_date'],
  domaine: ['domaine_fonctionnel'],
  lieu: ['lieu_de_survenue'],
  eig: ['inclure_eig'],
};

const ALL_FILTERS: ReadonlySet<DashboardFilterKey> = new Set(DASHBOARD_FILTER_KEYS);

export function resolveAvailableFilters(
  visibleCards: StatisticsCard[],
  allCards: StatisticsCard[],
): ReadonlySet<DashboardFilterKey> {
  const hasMappingInfo = allCards.some((card) => card.filterSlugs.length > 0);
  if (!hasMappingInfo) return ALL_FILTERS;

  const usedSlugs = new Set(visibleCards.flatMap((card) => card.filterSlugs));
  return new Set(DASHBOARD_FILTER_KEYS.filter((key) => FILTER_SLUGS[key].some((slug) => usedSlugs.has(slug))));
}
