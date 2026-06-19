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
  data: Array<Record<string, unknown>>;
};

export async function fetchStatisticsDashboard(): Promise<{ cards: StatisticsCard[] }> {
  const res = await client.statistics.dashboard.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchExportRequetesCsv(): Promise<Response> {
  const res = await fetch('/api/statistics/export-requetes');
  await handleRequestErrors(res, { silentToastError: true });
  return res;
}
