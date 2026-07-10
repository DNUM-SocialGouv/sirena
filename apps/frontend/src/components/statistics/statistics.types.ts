import type { InferResponseType } from 'hono/client';
import type { client } from '@/lib/api/hc';

type DashboardResponse = InferResponseType<(typeof client.statistics.dashboard)['$get'], 200>;

export type StatisticsCard = DashboardResponse['data']['cards'][number];
export type CardData = StatisticsCard['data'];
export type MetabaseColumn = CardData['cols'][number];
