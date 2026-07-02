import { Button } from '@codegouvfr/react-dsfr/Button';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TableSearchBar } from '@/components/common/tables/TableSearchBar';
import { useDirectionsServicesRows } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/directions-services/')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN]),
  component: RouteComponent,
});

type DirectionServiceRow = NonNullable<Awaited<ReturnType<typeof useDirectionsServicesRows>>['data']>['data'][number];

const columns: Column<DirectionServiceRow>[] = [
  { key: 'directionNom', label: 'Nom de la direction' },
  { key: 'directionLabel', label: 'Abréviation direction' },
  { key: 'serviceNom', label: 'Nom du service' },
  { key: 'serviceLabel', label: 'Abréviation service' },
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
    const representedUnitName = row.serviceNom || row.directionNom;

    return (
      <Button type="button" disabled size="small" priority="secondary">
        Modifier <span className="fr-sr-only">{representedUnitName}</span>
      </Button>
    );
  },
};

export function RouteComponent() {
  const { data: profile } = useProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
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

  useEffect(() => {
    document.title = title;
  }, [title]);

  const rows = directionsServicesQuery.data?.data ?? [];
  const filteredRows = useMemo(() => filterRowsBySearch(rows, activeSearch), [rows, activeSearch]);

  const handleSearch = useCallback((value: string) => {
    setActiveSearch(value.trim());
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    setActiveSearch('');
  }, []);

  return (
    <section>
      <h2>{title}</h2>
      <p className="fr-text--sm fr-mb-0">Gestion de : directions et services</p>

      <TableSearchBar
        label="Rechercher une organisation par nom ou libellé"
        value={searchTerm}
        activeSearch={activeSearch}
        total={filteredRows.length}
        onValueChange={setSearchTerm}
        onSearch={handleSearch}
        onClear={handleClearSearch}
      />

      <div>
        {canCreateDirection ? (
          <Button type="button" disabled>
            Ajouter une direction
          </Button>
        ) : null}
        {canCreateService ? (
          <Button type="button" disabled priority="secondary">
            Ajouter un service
          </Button>
        ) : null}
      </div>

      <DataTable
        title="Liste des directions et services"
        hideCaption
        rowId="id"
        data={filteredRows}
        columns={columns}
        cells={cells}
        isLoading={directionsServicesQuery.isFetching}
      />
    </section>
  );
}
