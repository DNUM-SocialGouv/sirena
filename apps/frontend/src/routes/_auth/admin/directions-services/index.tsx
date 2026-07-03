import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSearchBar } from '@/components/common/tables/TableSearchBar';
import { useDirectionsServicesRows } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import './index.css';

export const Route = createFileRoute('/_auth/admin/directions-services/')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN]),
  component: RouteComponent,
});

type DirectionServiceRow = NonNullable<Awaited<ReturnType<typeof useDirectionsServicesRows>>['data']>['data'][number];

const columns: Column<DirectionServiceRow>[] = [
  { key: 'directionNom', label: 'Nom de la direction' },
  { key: 'directionLabel', label: 'Abréviation de la direction' },
  { key: 'serviceNom', label: 'Nom du service' },
  { key: 'serviceLabel', label: 'Abréviation du service' },
  { key: 'email', label: 'E-mail de notification' },
  { key: 'custom:edit', label: 'Action' },
];

const filterRowsBySearch = (rows: DirectionServiceRow[], search: string) => {
  const normalizedSearch = search.trim().toLocaleLowerCase('fr');

  if (!normalizedSearch) {
    return rows;
  }

  return rows.filter((row) =>
    [row.directionNom, row.directionLabel, row.serviceNom, row.serviceLabel].some((value) =>
      value.toLocaleLowerCase('fr').includes(normalizedSearch),
    ),
  );
};

const cells: Cells<DirectionServiceRow> = {
  'custom:edit': (row) => {
    const editLabel = row.serviceNom
      ? `le service ${row.serviceNom} de la direction ${row.directionNom}`
      : `la direction ${row.directionNom}`;

    return (
      <Button type="button" disabled size="small" priority="secondary">
        Modifier <span className="fr-sr-only">{editLabel}</span>
      </Button>
    );
  },
};

export function RouteComponent() {
  const { data: profile } = useProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const directionsServicesQuery = useDirectionsServicesRows({ search: activeSearch || undefined });
  const affectationLevel = profile?.affectationChain?.length ?? 1;
  const isAffectedToEntiteAdministrative = affectationLevel === 1;
  const isAffectedToDirection = affectationLevel === 2;
  const canCreateDirection = isAffectedToEntiteAdministrative;
  const canCreateService = isAffectedToEntiteAdministrative || isAffectedToDirection;
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
  const filteredRows = useMemo(() => filterRowsBySearch(rows, activeSearch), [rows, activeSearch]);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const shouldShowPagination = filteredRows.length > pageSize;

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
            dans SIRENA, <i>Direction</i> désigne le premier niveau de votre organisation et <i>Service</i> désigne le
            second niveau. Un <i>Service</i> est donc toujours rattaché à une <i>Direction</i>.
          </>
        }
      />

      <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--middle" data-testid="directions-services-toolbar">
        <div className="fr-col-12 fr-col-md-5">
          <TableSearchBar
            label="Rechercher une organisation par nom ou libellé"
            value={searchTerm}
            activeSearch={activeSearch}
            total={filteredRows.length}
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
              <Button type="button" disabled>
                Ajouter une direction
              </Button>
            </div>
          ) : null}
          {canCreateService ? (
            <div className="fr-col-auto">
              <Button type="button" disabled priority="secondary">
                Ajouter un service
              </Button>
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
