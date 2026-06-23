import { useQuery } from '@tanstack/react-query';
import { fetchStatisticsDashboard, type StatisticsDashboardFilters } from '@/lib/api/fetchStatistics';

export const useStatisticsDashboard = (filters: StatisticsDashboardFilters = {}, enabled = true) =>
  useQuery({
    queryKey: ['statistics', 'dashboard', filters.startDate ?? null, filters.endDate ?? null],
    queryFn: () => fetchStatisticsDashboard(filters),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
