import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSearchBar } from '@/components/common/tables/TableSearchBar';
import { useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { requireAdminLocalDirectionsServices } from './-route-guard';
import './index.css';

export const Route = createFileRoute('/_auth/admin/directions-services/')({
  beforeLoad: requireAdminLocalDirectionsServices,
  component: RouteComponent,
});

type DirectionServiceRow = NonNullable<Awaited<ReturnType<typeof useDirectionsServicesList>>['data']>['data'][number];

const columns: Column<DirectionServiceRow>[] = [
  { key: 'directionNom', label: 'Nom de la direction' },
  { key: 'directionLabel', label: 'Abréviation de la direction' },
  { key: 'serviceNom', label: 'Nom du service' },
  { key: 'serviceLabel', label: 'Abréviation du service' },
  { key: 'email', label: 'E-mail de notification' },
  { key: 'custom:edit', label: 'Action' },
];

const cells: Cells<DirectionServiceRow> = {
  'custom:edit': (row) => {
    if (!row.canEdit) {
      return null;
    }

    const editLabel = row.serviceNom
      ? `le service ${row.serviceNom} de la direction ${row.directionNom}`
      : `la direction ${row.directionNom}`;

    return (
      <Link
        className="fr-btn fr-btn--secondary fr-btn--sm"
        to="/admin/directions-services/$entiteId/edit"
        params={{ entiteId: row.editId }}
      >
        Modifier <span className="fr-sr-only">{editLabel}</span>
      </Link>
    );
  },
};

export function RouteComponent() {
  const { data: profile } = useProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const directionsServicesQuery = useDirectionsServicesList({ search: activeSearch || undefined });
  const capabilities = directionsServicesQuery.data?.capabilities;
  const canCreateDirection = capabilities?.canCreateDirection ?? false;
  const canCreateService = capabilities?.canCreateService ?? false;
  const organizationName = profile?.affectationChain?.at(-1)?.nomComplet;
  const title = useMemo(
    () => (organizationName ? `Directions et services (${organizationName})` : 'Directions et services'),
    [organizationName],
  );
  const documentTitle = `${title} - Espace administrateur - SIRENA`;

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  const rows = directionsServicesQuery.data?.data ?? [];
  const pageSize = 10;
  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const shouldShowPagination = rows.length > pageSize;

  const handleSearch = useCallback((value: string) => {
    setCurrentPage(1);
    setActiveSearch(value.trim());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveSearch('');
    setCurrentPage(1);
  }, []);

  return (
    <section>
      <h2>{title}</h2>

      <Alert
        className="fr-mb-3w"
        severity="info"
        small
        description={
          <>
            Dans SIRENA, <i>“direction”</i> désigne le premier niveau de votre organisation et <i>“service”</i> désigne
            le second niveau. Un <i>service</i> est donc toujours rattaché à une <i>direction</i>.
          </>
        }
      />

      <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--middle" data-testid="directions-services-toolbar">
        <div className="fr-col-12 fr-col-md-5">
          <TableSearchBar
            label="Rechercher une organisation par nom ou libellé"
            value={searchTerm}
            activeSearch={activeSearch}
            total={rows.length}
            onValueChange={setSearchTerm}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            inputContainerClassName="fr-col-12"
          />
        </div>
        <div
          className="directions-services-actions fr-col-12 fr-col-md-7 fr-grid-row fr-grid-row--right"
          data-testid="directions-services-actions"
        >
          {canCreateDirection ? (
            <div className="fr-col-auto">
              <Link className="fr-btn" to="/admin/directions-services/directions/create">
                Ajouter une direction
              </Link>
            </div>
          ) : null}
          {canCreateService ? (
            <div className="fr-col-auto">
              <Link className="fr-btn fr-btn--secondary" to="/admin/directions-services/services/create">
                Ajouter un service
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <DataTable
        title="Liste des directions et services"
        hideCaption
        rowId="id"
        data={paginatedRows}
        columns={columns}
        cells={cells}
        isLoading={directionsServicesQuery.isFetching}
      />

      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination
            count={totalPages}
            defaultPage={currentPage}
            getPageLinkProps={(pageNumber) => ({
              href: '#',
              onClick: (event) => {
                event.preventDefault();
                setCurrentPage(pageNumber);
              },
            })}
          />
        </div>
      )}
    </section>
  );
}
