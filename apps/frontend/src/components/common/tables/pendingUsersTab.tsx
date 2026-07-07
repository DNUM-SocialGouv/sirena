import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable, type OnSortChangeParams } from '@sirena/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUsers } from '@/hooks/queries/users.hook';
import { useUserListSSE } from '@/hooks/useUserListSSE';
import { useListStateStore } from '@/stores/listStateStore';
import { TableSearchBar } from './TableSearchBar';

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

const getEffectiveSort = (sort?: string, order?: 'asc' | 'desc') => {
  const columnKey = mapSortKeyToColumnKey(sort);

  if (!columnKey || !order) {
    return {};
  }

  return { sort, order };
};

export function PendingUsersTab() {
  const queryClient = useQueryClient();
  const pendingRoleId = ROLES.PENDING;

  const queries = useSearch({ from: '/_auth/admin/users' });
  const navigate = useNavigate({ from: '/admin/users' });
  const setListLocation = useListStateStore((s) => s.setListLocation);

  useEffect(() => {
    setListLocation('users', { to: '/admin/users', search: queries });
  }, [queries, setListLocation]);

  const limit = queries.limit ?? DEFAULT_PAGE_SIZE;
  const offset = queries.offset ?? 0;
  const effectiveSort = useMemo(() => getEffectiveSort(queries.sort, queries.order), [queries.sort, queries.order]);
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const [searchTerm, setSearchTerm] = useState<string>(queries.search ?? '');

  useEffect(() => {
    setSearchTerm(queries.search ?? '');
  }, [queries.search]);

  const handleSearch = useCallback(
    (value: string) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: value.trim() || undefined,
          offset: undefined,
        }),
      });
    },
    [navigate],
  );

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        offset: undefined,
      }),
    });
  }, [navigate]);

  const handleUserListChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  useUserListSSE({
    enabled: true,
    onUserListChange: handleUserListChange,
  });

  const { data: users, isFetching } = useUsers({
    roleId: pendingRoleId,
    ...effectiveSort,
    limit,
    offset,
    ...(queries.search && { search: queries.search }),
  });

  const columns: Column<User>[] = [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    {
      key: 'createdAt',
      label: 'Date de création',
      isSortable: true,
      initialSortDirection: 'desc',
      sortLabels: {
        asc: 'Trier par date de création de la plus ancienne à la plus récente',
        desc: 'Trier par date de création de la plus récente à la plus ancienne',
        reset: 'Réinitialiser le tri de la date de création',
      },
    },
    {
      key: 'custom:affectation',
      label: 'Affectation',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par affectation de A à Z',
        desc: 'Trier par affectation de Z à A',
        reset: "Réinitialiser le tri de l'affectation",
      },
    },
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
    const columnKey = mapSortKeyToColumnKey(effectiveSort.sort);

    return {
      sort: (columnKey || '') as OnSortChangeParams<User>['sort'],
      sortDirection: (effectiveSort.order || '') as OnSortChangeParams<User>['sortDirection'],
    };
  }, [effectiveSort]);

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
      <h2 className="fr-h4 fr-mb-2w">Demande d'habilitation en attente</h2>
      <TableSearchBar
        label="Rechercher un utilisateur par nom, prénom ou e-mail"
        value={searchTerm}
        activeSearch={queries.search}
        total={users ? total : undefined}
        onValueChange={setSearchTerm}
        onSearch={handleSearch}
        onClear={handleClearSearch}
      />
      <DataTable
        title="Demande d'habilitation en attente"
        hideCaption
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
