import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES, type Role, roles, type StatutType, statutTypes } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';
import { useUsers } from '@/hooks/queries/users.hook';

type User = NonNullable<Awaited<ReturnType<typeof useUsers>>['data']>['data'][number];

const DEFAULT_PAGE_SIZE = 10;

export function AllUsersTab() {
  const { data } = useQuery({ ...profileQueryOptions(), enabled: false });

  const queries = useSearch({ from: '/_auth/admin/users' });
  const navigate = useNavigate({ from: '/admin/users' });

  const rolesToFilter: Role[] =
    data?.role?.id === ROLES.ENTITY_ADMIN ? [ROLES.SUPER_ADMIN, ROLES.PENDING] : [ROLES.PENDING];

  const filteredRoles = (Object.keys(roles) as Role[]).filter((roleId) => !rolesToFilter.includes(roleId)).join(',');

  const limit = useMemo(() => parseInt(queries.limit || DEFAULT_PAGE_SIZE.toString(), 10), [queries.limit]);
  const offset = useMemo(() => parseInt(queries.offset || '0', 10), [queries.offset]);
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const { data: users, isFetching } = useUsers({
    roleId: filteredRoles,
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const columns: Column<User>[] = [
    { key: 'lastName', label: 'Nom' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'role.label', label: 'Rôle' },
    { key: 'statutId', label: 'Statut' },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells: Cells<User> = {
    statutId: (row: User) => statutTypes[row.statutId as StatutType],
    'custom:editionLabel': (row: User) => (
      <Link to="/admin/user/$userId" className="fr-link" params={{ userId: row.id }}>
        Gérer l'utilisateur
      </Link>
    ),
  };

  const total = useMemo(() => users?.meta?.total ?? 0, [users?.meta?.total]);
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const shouldShowPagination = useMemo(() => total > limit, [total, limit]);

  const getPageLinkProps = useCallback(
    (pageNumber: number) => {
      const newOffset = (pageNumber - 1) * limit;

      return {
        href: '#',
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          navigate({
            search: (prev) => ({
              ...prev,
              offset: newOffset === 0 ? undefined : newOffset.toString(),
              limit: limit === DEFAULT_PAGE_SIZE ? undefined : limit.toString(),
            }),
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      };
    },
    [navigate, limit],
  );

  return (
    <>
      <DataTable
        title="Liste des utilisateurs"
        rowId="id"
        data={users?.data ?? []}
        columns={columns}
        cells={cells}
        isLoading={isFetching}
      />
      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </>
  );
}
