import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export type StatisticsCard = {
  id: number;
  dashcardId: number;
  name: string;
  data: Array<Record<string, unknown>>;
};

export async function fetchStatisticsDashboard(): Promise<{ cards: StatisticsCard[] }> {
  const res = await client.statistics.dashboard.$get();
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data as { cards: StatisticsCard[] };
}
