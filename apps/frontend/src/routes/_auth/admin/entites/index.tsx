import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
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

  const entitesListQuery = useEntitesListAdmin({
    offset,
    limit,
    ...(search.rootEntiteIds ? { rootEntiteIds: search.rootEntiteIds } : {}),
    ...(search.search ? { search: search.search } : {}),
  });

  const total = useMemo(() => entitesListQuery.data?.meta?.total ?? 0, [entitesListQuery.data?.meta?.total]);
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const shouldShowPagination = useMemo(() => total > limit, [total, limit]);

  const columns: Column<Entity>[] = [
    { key: 'entiteNom', label: 'Nom de l’entité' }, // Nom complet de l'entité
    { key: 'entiteLabel', label: 'Libellé de l’entité' },
    { key: 'directionNom', label: 'Nom de la direction' }, // Nom complet de la direction
    { key: 'directionLabel', label: 'Libellé de la direction' },
    { key: 'serviceNom', label: 'Nom du service' }, // Nom complet du service
    { key: 'serviceLabel', label: 'Libellé du service' },
    { key: 'email', label: 'Email' },
    { key: 'contactUsager', label: 'Contact usager' },
    { key: 'isActiveLabel', label: 'Statut (Actif)' },
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
        label="Rechercher une entité administrative par nom ou libellé"
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
