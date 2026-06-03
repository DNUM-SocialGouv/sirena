import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable, type OnSortChangeParams } from '@sirena/ui';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RootEntitesFilter } from '@/components/common/filters/RootEntitesFilter';
import { TableSearchBar } from '@/components/common/tables/TableSearchBar';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useEntitesListAdmin, useRootEntitesListAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { QueryParamsSchema } from '@/schemas/pagination.schema';
import './index.css';

export const Route = createFileRoute('/_auth/admin/entites/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  validateSearch: QueryParamsSchema,
  head: () => ({
    meta: [
      {
        title: 'Gestion des entités - Espace administrateur -SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

const DEFAULT_PAGE_SIZE = 10;

type Entity = NonNullable<Awaited<ReturnType<typeof useEntitesListAdmin>>['data']>['data'][number];

const mapColumnKeyToSortKey = (columnKey: string): string | undefined => {
  switch (columnKey) {
    case 'entiteNom':
    case 'entiteLabel':
    case 'directionNom':
    case 'directionLabel':
    case 'serviceNom':
    case 'serviceLabel':
    case 'email':
    case 'contactUsager':
    case 'isActiveLabel':
      return columnKey;
    default:
      return undefined;
  }
};

const mapSortKeyToColumnKey = (sortKey: string | undefined): string => {
  switch (sortKey) {
    case 'entiteNom':
    case 'entiteLabel':
    case 'directionNom':
    case 'directionLabel':
    case 'serviceNom':
    case 'serviceLabel':
    case 'email':
    case 'contactUsager':
    case 'isActiveLabel':
      return sortKey;
    default:
      return '';
  }
};

const getEffectiveSort = (sort?: string, order?: 'asc' | 'desc') => {
  const columnKey = mapSortKeyToColumnKey(sort);
  if (!columnKey || !order) return {};
  return { sort, order };
};

export function RouteComponent() {
  const search = useSearch({ from: '/_auth/admin/entites/' });
  const navigate = useNavigate({ from: '/admin/entites/' });

  const limit = search.limit ?? DEFAULT_PAGE_SIZE;
  const offset = search.offset ?? 0;
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const [searchTerm, setSearchTerm] = useState(search.search ?? '');

  useEffect(() => {
    setSearchTerm(search.search ?? '');
  }, [search.search]);

  const rootEntitesListQuery = useRootEntitesListAdmin();
  const selectedRootEntiteIds = useMemo(
    () => (search.rootEntiteIds ? search.rootEntiteIds.split(',').filter(Boolean) : []),
    [search.rootEntiteIds],
  );

  const handleRootEntitesChange = useCallback(
    (rootEntiteIds: string[]) => {
      navigate({
        search: (prev) => ({
          ...prev,
          rootEntiteIds: rootEntiteIds.length > 0 ? rootEntiteIds.join(',') : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate],
  );

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

  const effectiveSort = useMemo(() => getEffectiveSort(search.sort, search.order), [search.sort, search.order]);

  const entitesListQuery = useEntitesListAdmin({
    offset,
    limit,
    ...(search.rootEntiteIds ? { rootEntiteIds: search.rootEntiteIds } : {}),
    ...(search.search ? { search: search.search } : {}),
    ...effectiveSort,
  });

  const total = useMemo(() => entitesListQuery.data?.meta?.total ?? 0, [entitesListQuery.data?.meta?.total]);

  useEffect(() => {
    document.title = search.search
      ? `${total} résultat${total > 1 ? 's' : ''} pour : "${search.search}" - Gestion des entités - Espace administrateur - SIRENA`
      : 'Gestion des entités - Espace administrateur - SIRENA';
  }, [search.search, total]);

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const shouldShowPagination = useMemo(() => total > limit, [total, limit]);

  const columns: Column<Entity>[] = [
    {
      key: 'entiteNom',
      label: 'Nom de l’entité',
      isSortable: true,
      sortLabels: {
        asc: "Trier par le nom de l'entité de A à Z",
        desc: "Trier par le nom de l'entité de Z à A",
        reset: "Réinitialiser le tri du nom de l'entité",
      },
    },
    {
      key: 'entiteLabel',
      label: 'Libellé de l’entité',
      isSortable: true,
      sortLabels: {
        asc: "Trier par le libellé de l'entité de A à Z",
        desc: "Trier par le libellé de l'entité de Z à A",
        reset: "Réinitialiser le tri du libellé de l'entité",
      },
    },
    {
      key: 'directionNom',
      label: 'Nom de la direction',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par le nom de la direction de A à Z',
        desc: 'Trier par le nom de la direction de Z à A',
        reset: 'Réinitialiser le tri du nom de la direction',
      },
    },
    {
      key: 'directionLabel',
      label: 'Libellé de la direction',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par le libellé de la direction de A à Z',
        desc: 'Trier par le libellé de la direction de Z à A',
        reset: 'Réinitialiser le tri du libellé de la direction',
      },
    },
    {
      key: 'serviceNom',
      label: 'Nom du service',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par le nom du service de A à Z',
        desc: 'Trier par le nom du service de Z à A',
        reset: 'Réinitialiser le tri du nom du service',
      },
    },
    {
      key: 'serviceLabel',
      label: 'Libellé du service',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par le libellé du service de A à Z',
        desc: 'Trier par le libellé du service de Z à A',
        reset: 'Réinitialiser le tri du libellé du service',
      },
    },
    {
      key: 'email',
      label: 'Email',
      isSortable: true,
      sortLabels: {
        asc: "Trier par l'email de A à Z",
        desc: "Trier par l'email de Z à A",
        reset: "Réinitialiser le tri de l'email",
      },
    },
    {
      key: 'contactUsager',
      label: 'Contact usager',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par le contact usager de A à Z',
        desc: 'Trier par le contact usager de Z à A',
        reset: 'Réinitialiser le tri du contact usager',
      },
    },
    {
      key: 'isActiveLabel',
      label: 'Statut (Actif)',
      isSortable: true,
      initialSortDirection: 'desc',
      sortLabels: {
        desc: 'Trier par les statuts actifs en premier',
        asc: 'Trier par les statuts inactifs en premier',
        reset: 'Réinitialiser le tri du statut',
      },
    },
    { key: 'custom:edit', label: 'Modifier' },
  ];

  const cells: Cells<Entity> = {
    'custom:edit': (row) => {
      const srLabel = row.serviceNom
        ? `le service ${row.serviceNom} de la direction ${row.directionNom} de l'entité ${row.entiteNom}`
        : row.directionNom
          ? `la direction ${row.directionNom} de l'entité ${row.entiteNom}`
          : `l'entité ${row.entiteNom}`;

      return (
        <Link to="/admin/entites/$entiteId" params={{ entiteId: row.editId }}>
          Modifier <span className="fr-sr-only">{srLabel}</span>
        </Link>
      );
    },
  };

  const handleSortChange = useCallback(
    (params: OnSortChangeParams<Entity>) => {
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
      sort: (columnKey || '') as OnSortChangeParams<Entity>['sort'],
      sortDirection: (effectiveSort.order || '') as OnSortChangeParams<Entity>['sortDirection'],
    };
  }, [effectiveSort]);

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
      <h2 className="fr-h4 fr-mb-2w">Liste des entités administratives</h2>

      <fieldset className="admin-entites-filters fr-mb-2w">
        <div className="admin-entites-filters__row">
          <legend className="fr-text--regular">Filtrer les entités</legend>
          <div className="admin-entites-filters__items">
            <RootEntitesFilter
              rootEntites={rootEntitesListQuery.data?.data ?? []}
              selectedRootEntiteIds={selectedRootEntiteIds}
              onChange={handleRootEntitesChange}
            />
          </div>
        </div>
      </fieldset>
      <TableSearchBar
        label="Rechercher une entité, direction ou service par nom ou libellé"
        value={searchTerm}
        activeSearch={search.search}
        total={entitesListQuery.data?.meta?.total}
        onValueChange={setSearchTerm}
        onSearch={handleSearch}
        onClear={handleClearSearch}
        inputContainerClassName="fr-col-12 fr-col-md-5"
      />

      <QueryStateHandler query={entitesListQuery} noDataComponent={<p>Aucune entité administrative à afficher.</p>}>
        {({ data }) => (
          <div className="admin-entites-table">
            <DataTable
              title="Liste des entités administratives"
              hideCaption
              rowId="id"
              data={data.data}
              columns={columns}
              cells={cells}
              isLoading={entitesListQuery.isFetching}
              sort={currentSort}
              onSortChange={handleSortChange}
            />
          </div>
        )}
      </QueryStateHandler>

      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </>
  );
}
