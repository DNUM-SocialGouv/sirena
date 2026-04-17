import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useEntitesListAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { QueryParamsSchema } from '@/schemas/pagination.schema';

export const Route = createFileRoute('/_auth/admin/entities/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  validateSearch: QueryParamsSchema,
  component: RouteComponent,
});

const DEFAULT_PAGE_SIZE = 10;

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
    <div className="fr-container-fluid">
      <h1>Liste des entités administratives</h1>
      <QueryStateHandler query={entitesListQuery} noDataComponent={<p>Aucune entité administrative à afficher.</p>}>
        {({ data }) => (
          <>
            <p>
              {data.meta.total} entité{data.meta.total > 1 ? 's' : ''}
            </p>
            <div className="fr-table fr-table--layout-fixed fr-table--no-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Entité</th>
                    <th>Ent.</th>
                    <th>Direction</th>
                    <th>Dir.</th>
                    <th>Service</th>
                    <th>Serv.</th>
                    <th>Email</th>
                    <th>Contact usager</th>
                    <th>Actif</th>
                    <th>Éditer</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((entite) => (
                    <tr key={entite.id}>
                      <td>{entite.entiteNom}</td>
                      <td>{entite.entiteLabel}</td>
                      <td>{entite.directionNom}</td>
                      <td>{entite.directionLabel}</td>
                      <td>{entite.serviceNom}</td>
                      <td>{entite.serviceLabel}</td>
                      <td>{entite.email}</td>
                      <td>{entite.contactUsager}</td>
                      <td>{entite.isActiveLabel}</td>
                      <td>
                        <Link to="/admin/entities/$entityId" params={{ entityId: entite.editId }}>
                          Éditer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </QueryStateHandler>

      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </div>
  );
}
