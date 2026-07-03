import type { CardData } from '@/components/statistics/chartData';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export type StatisticsCardLayout = {
  col: number;
  row: number;
  sizeX: number;
  sizeY: number;
};

export type StatisticsCard = {
  id: number;
  dashcardId: number;
  name: string;
  display: string | null;
  layout: StatisticsCardLayout | null;
  data: CardData;
};

export type StatisticsDashboardFilters = {
  startDate?: string;
  endDate?: string;
};

export async function fetchStatisticsDashboard(
  filters: StatisticsDashboardFilters = {},
): Promise<{ cards: StatisticsCard[] }> {
  const query: Record<string, string> = {};
  if (filters.startDate) query.startDate = filters.startDate;
  if (filters.endDate) query.endDate = filters.endDate;

  const res = await client.statistics.dashboard.$get({ query });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchExportRequetesCsv(): Promise<Response> {
  const res = await client.statistics['export-requetes'].$get();
  await handleRequestErrors(res, { silentToastError: true });
  return res;
}
