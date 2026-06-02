import { useQuery } from '@tanstack/react-query';
import { fetchStatisticsDashboard } from '@/lib/api/fetchStatistics';

export const useStatisticsDashboard = (enabled = true) =>
  useQuery({
    queryKey: ['statistics', 'dashboard'],
    queryFn: fetchStatisticsDashboard,
    enabled,
    staleTime: 60_000,
  });
