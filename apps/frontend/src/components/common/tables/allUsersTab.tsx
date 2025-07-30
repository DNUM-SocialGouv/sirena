import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES, roles, type StatutType, statutTypes } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { useUsers } from '@/hooks/queries/users.hook';

type User = NonNullable<Awaited<ReturnType<typeof useUsers>>['data']>['data'][number];

const PAGE_SIZE = 10;

export function AllUsersTab() {
  const nonPendingRoleIds = Object.keys(roles)
    .filter((roleId) => roleId !== ROLES.PENDING)
    .join(',');

  const queries = useSearch({ from: '/_auth/admin/users' });
  const navigate = useNavigate({ from: '/admin/users' });

  const offset = useMemo(() => parseInt(queries.offset || '0', 10), [queries.offset]);
  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset]);

  const { data: users, isFetching } = useUsers({
    roleId: nonPendingRoleIds,
    limit: PAGE_SIZE.toString(),
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
  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);
  const shouldShowPagination = useMemo(() => total > PAGE_SIZE, [total]);

  const getPageLinkProps = useCallback(
    (pageNumber: number) => {
      const newOffset = (pageNumber - 1) * PAGE_SIZE;

      return {
        href: '#',
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          navigate({
            search: (prev) => ({
              ...prev,
              offset: newOffset === 0 ? undefined : newOffset.toString(),
              limit: PAGE_SIZE.toString(),
            }),
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      };
    },
    [navigate],
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
