import { useMatches } from '@tanstack/react-router';
import { useListStateStore } from '@/stores/listStateStore';
import { useUserStore } from '@/stores/userStore';
import { type BreadCrumbItem, getBreadCrumbItems } from './breadcrumbConfig';

export function useAppBreadCrumb(): BreadCrumbItem[] | null {
  const leafMatch = useMatches({ select: (matches) => matches.at(-1) });
  const role = useUserStore((s) => s.role);
  const listStates = useListStateStore((s) => s.states);

  if (!leafMatch) return null;

  return getBreadCrumbItems(leafMatch.routeId, {
    params: leafMatch.params as Record<string, string>,
    role,
    listStates,
  });
}
