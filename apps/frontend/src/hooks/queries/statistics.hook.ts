import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchRequetesExportStatus,
  fetchStatisticsDashboard,
  type StatisticsDashboardFilters,
} from '@/lib/api/fetchStatistics';

export const useStatisticsDashboard = (filters: StatisticsDashboardFilters = {}, enabled = true) =>
  useQuery({
    queryKey: [
      'statistics',
      'dashboard',
      filters.startDate ?? null,
      filters.endDate ?? null,
      filters.domaineIds ?? null,
      filters.includeEIG ?? null,
      filters.lieuTypes ?? null,
    ],
    queryFn: ({ signal }) => fetchStatisticsDashboard(filters, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    retry: 1,
  });

export const REQUETES_EXPORT_STATUS_QUERY_KEY = ['statistics', 'requetes-export', 'status'] as const;

// While an export is being generated, check again regularly: the button comes back once it is done.
const EXPORT_STATUS_REFETCH_INTERVAL_MS = 10_000;

export const useRequetesExportStatus = (enabled = true) =>
  useQuery({
    queryKey: REQUETES_EXPORT_STATUS_QUERY_KEY,
    queryFn: fetchRequetesExportStatus,
    enabled,
    refetchInterval: (query) => (query.state.data?.inProgress ? EXPORT_STATUS_REFETCH_INTERVAL_MS : false),
    retry: 1,
  });
