import type { InferResponseType } from 'hono/client';
import type { client } from '@/lib/api/hc';

type DashboardResponse = InferResponseType<(typeof client.statistics.dashboard)['$get'], 200>;

export type StatisticsDashboard = DashboardResponse['data'];
export type StatisticsTab = StatisticsDashboard['tabs'][number];
export type StatisticsCard = StatisticsDashboard['cards'][number];
export type CardData = StatisticsCard['data'];
export type MetabaseColumn = CardData['cols'][number];
