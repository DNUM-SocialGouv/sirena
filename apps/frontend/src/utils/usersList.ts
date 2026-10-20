import { ROLES } from '@sirena/common/constants';
import type { QueryParams } from '@/schemas/pagination.schema';
import type { ListState } from '@/stores/listStateStore';

export type UsersListTo = '/admin/users' | '/admin/users/all';

const NO_SEARCH: QueryParams = {};

/**
 * The admin users tab a user page leads back to: the one it was opened from, with its filters.
 * Without a remembered list (direct URL, bookmark, reload), a pending account belongs to the access requests tab.
 */
export function resolveUsersList(
  listState: ListState | undefined,
  roleId: string | undefined,
): { to: UsersListTo; search: QueryParams } {
  const fromList = listState?.to;
  const to: UsersListTo =
    fromList === '/admin/users' || fromList === '/admin/users/all'
      ? fromList
      : roleId === ROLES.PENDING
        ? '/admin/users'
        : '/admin/users/all';

  return { to, search: listState?.to === to ? listState.search : NO_SEARCH };
}
