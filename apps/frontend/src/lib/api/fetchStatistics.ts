import type { StatisticsCard, StatisticsDashboard } from '@/components/statistics/statistics.types';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export type { StatisticsCard, StatisticsDashboard };

export type StatisticsDashboardFilters = {
  startDate?: string;
  endDate?: string;
  domaineIds?: string;
  includeEIG?: boolean;
  lieuTypes?: string;
};

export async function fetchStatisticsDashboard(
  filters: StatisticsDashboardFilters = {},
  signal?: AbortSignal,
): Promise<StatisticsDashboard> {
  const query: Record<string, string> = {};
  if (filters.startDate) query.startDate = filters.startDate;
  if (filters.endDate) query.endDate = filters.endDate;
  if (filters.domaineIds) query.domaineIds = filters.domaineIds;
  if (filters.includeEIG === false) query.includeEIG = 'false';
  if (filters.lieuTypes) query.lieuTypes = filters.lieuTypes;

  const res = await client.statistics.dashboard.$get({ query }, { init: { signal } });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export type RequetesExportPeriod = {
  startDate: string;
  endDate: string;
};

// Business refusals (invalid period, no requête, export in progress) come back as an HttpError
// whose data carries the code; the caller shows the matching message, so no toast here.
export async function createRequetesExport(period: RequetesExportPeriod): Promise<{ id: string; email: string }> {
  const res = await client.statistics['requetes-export'].$post({ json: period });
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}

export async function fetchRequetesExportStatus(): Promise<{ inProgress: boolean }> {
  const res = await client.statistics['requetes-export'].status.$get();
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}
