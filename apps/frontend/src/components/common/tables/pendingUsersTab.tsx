import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable, type OnSortChangeParams } from '@sirena/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { useUsers } from '@/hooks/queries/users.hook';
import { useUserListSSE } from '@/hooks/useUserListSSE';

type User = NonNullable<Awaited<ReturnType<typeof useUsers>>['data']>['data'][number];

const DEFAULT_PAGE_SIZE = 10;

const mapColumnKeyToSortKey = (columnKey: string): string | undefined => {
  switch (columnKey) {
    case 'createdAt':
      return 'createdAt';
    case 'custom:affectation':
      return 'entite.nomComplet';
    default:
      return undefined;
  }
};

const mapSortKeyToColumnKey = (sortKey: string | undefined): string => {
  switch (sortKey) {
    case 'createdAt':
      return 'createdAt';
    case 'entite.nomComplet':
      return 'custom:affectation';
    default:
      return '';
  }
};

export function PendingUsersTab() {
  const queryClient = useQueryClient();
  const pendingRoleId = ROLES.PENDING;

  const queries = useSearch({ from: '/_auth/admin/users' });
  const navigate = useNavigate({ from: '/admin/users' });

  const limit = queries.limit ?? DEFAULT_PAGE_SIZE;
  const offset = queries.offset ?? 0;
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const handleUserListChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  useUserListSSE({
    enabled: true,
    onUserListChange: handleUserListChange,
  });

  const { data: users, isFetching } = useUsers({
    roleId: pendingRoleId,
    ...(queries.sort && { sort: queries.sort }),
    ...(queries.order && { order: queries.order }),
    limit,
    offset,
  });

  const columns: Column<User>[] = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'createdAt', label: 'Date de création', isSortable: true, initialSortDirection: 'desc' },
    { key: 'custom:affectation', label: 'Affectation', isSortable: true },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells: Cells<User> = {
    'custom:affectation': (row: User) => {
      const { entite } = row;
      if (!entite) return null;
      if (!entite.entiteMereId) return <span>{entite.nomComplet}</span>;
      const direction = entite.entiteMere;
      if (!direction?.entiteMereId) {
        return (
          <span>
            {entite.nomComplet}
            {direction ? ` (${direction.label})` : ''}
          </span>
        );
      }
      return (
        <span>
          {entite.nomComplet}
          {` (${direction.label}${direction.entiteMere ? ` - ${direction.entiteMere.label}` : ''})`}
        </span>
      );
    },
    createdAt: (row: User) => (
      <div>
        {new Date(row.createdAt).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}
      </div>
    ),
    'custom:editionLabel': (row: User) => (
      <Link to="/admin/user/$userId" params={{ userId: row.id }}>
        Traiter la demande
      </Link>
    ),
  };

  const handleSortChange = useCallback(
    (params: OnSortChangeParams<User>) => {
      const { sort: columnKey, sortDirection } = params;
      const sortKey = mapColumnKeyToSortKey(columnKey);

      navigate({
        search: (prev) => ({
          ...prev,
          sort: sortKey && sortDirection ? sortKey : undefined,
          order: sortKey && sortDirection ? sortDirection : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate],
  );

  const currentSort = useMemo(() => {
    const columnKey = mapSortKeyToColumnKey(queries.sort);

    return {
      sort: (columnKey || '') as OnSortChangeParams<User>['sort'],
      sortDirection: (queries.order || '') as OnSortChangeParams<User>['sortDirection'],
    };
  }, [queries.sort, queries.order]);

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
              offset: newOffset === 0 ? undefined : newOffset,
              limit: limit === DEFAULT_PAGE_SIZE ? undefined : limit,
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
        title="Demande d'habilitation en attente"
        rowId="id"
        data={users?.data ?? []}
        columns={columns}
        cells={cells}
        isLoading={isFetching}
        sort={currentSort}
        onSortChange={handleSortChange}
      />
      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </>
  );
}
