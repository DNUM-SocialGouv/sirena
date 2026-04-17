import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useEntitesListAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { QueryParamsSchema } from '@/schemas/pagination.schema';

export const Route = createFileRoute('/_auth/admin/entities/')({
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
  const search = useSearch({ from: '/_auth/admin/entities/' });
  const navigate = useNavigate({ from: '/admin/entities/' });

  const limit = search.limit ?? DEFAULT_PAGE_SIZE;
  const offset = search.offset ?? 0;
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const entitesListQuery = useEntitesListAdmin({
    offset,
    limit,
  });

  const total = useMemo(() => entitesListQuery.data?.meta?.total ?? 0, [entitesListQuery.data?.meta?.total]);
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const shouldShowPagination = useMemo(() => total > limit, [total, limit]);

  const columns: Column<Entity>[] = [
    { key: 'entiteNom', label: 'Entité' },
    { key: 'entiteLabel', label: 'Ent.' },
    { key: 'directionNom', label: 'Direction' },
    { key: 'directionLabel', label: 'Dir.' },
    { key: 'serviceNom', label: 'Service' },
    { key: 'serviceLabel', label: 'Serv.' },
    { key: 'email', label: 'Email' },
    { key: 'contactUsager', label: 'Contact usager' },
    { key: 'isActiveLabel', label: 'Actif' },
    { key: 'custom:edit', label: 'Éditer' },
  ];

  const cells: Cells<Entity> = {
    'custom:edit': (row) => (
      <Link to="/admin/entities/$entityId" params={{ entityId: row.editId }}>
        Modifier
      </Link>
    ),
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
      <QueryStateHandler query={entitesListQuery} noDataComponent={<p>Aucune entité administrative à afficher.</p>}>
        {({ data }) => (
          <DataTable
            title="Liste des entités administratives"
            rowId="id"
            data={data.data}
            columns={columns}
            cells={cells}
            isLoading={entitesListQuery.isFetching}
          />
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
