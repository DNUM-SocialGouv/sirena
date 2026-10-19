import { useQuery } from '@tanstack/react-query';
import { useMatches } from '@tanstack/react-router';
import { useUserByIdQueryOptions } from '@/hooks/queries/users.hook';
import { useListStateStore } from '@/stores/listStateStore';
import { useUserStore } from '@/stores/userStore';
import { type BreadCrumbItem, getBreadCrumbItems } from './breadcrumbConfig';

export function useAppBreadCrumb(): BreadCrumbItem[] | null {
  const leafMatch = useMatches({ select: (matches) => matches.at(-1) });
  const role = useUserStore((s) => s.role);
  const listStates = useListStateStore((s) => s.states);
  const params = (leafMatch?.params ?? {}) as Record<string, string>;
  const editedUserId = leafMatch?.routeId === '/_auth/admin/user/$userId' ? params.userId : undefined;
  // The user page loads the edited user: only read it from the cache
  const { data: editedUserRoleId } = useQuery({
    ...useUserByIdQueryOptions(editedUserId ?? ''),
    enabled: false,
    select: (user) => user.roleId,
  });

  if (!leafMatch) return null;

  return getBreadCrumbItems(leafMatch.routeId, { params, role, listStates, editedUserRoleId });
}
