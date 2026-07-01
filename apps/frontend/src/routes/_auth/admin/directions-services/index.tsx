import { Button } from '@codegouvfr/react-dsfr/Button';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
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
  { key: 'directionLabel', label: 'Libellé de la direction' },
  { key: 'serviceNom', label: 'Nom du service' },
  { key: 'serviceLabel', label: 'Libellé du service' },
  { key: 'email', label: 'Email' },
  { key: 'custom:edit', label: 'Action' },
];

const cells: Cells<DirectionServiceRow> = {
  'custom:edit': () => (
    <Button type="button" disabled size="small" priority="secondary">
      Modifier
    </Button>
  ),
};

export function RouteComponent() {
  const { data: profile } = useProfile();
  const directionsServicesQuery = useDirectionsServicesRows();
  const affectationLevel = profile?.affectationChain?.length ?? 1;
  const isAffectedToEntiteAdministrative = affectationLevel === 1;
  const canCreateDirection = isAffectedToEntiteAdministrative;
  const organizationName = profile?.affectationChain?.at(-1)?.nomComplet;
  const title = useMemo(
    () => (organizationName ? `Directions et services (${organizationName})` : 'Directions et services'),
    [organizationName],
  );

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <section>
      <h2>{title}</h2>
      <p className="fr-text--sm fr-mb-0">Gestion de : directions et services</p>

      <div>
        {canCreateDirection ? (
          <Button type="button" disabled>
            Ajouter une direction
          </Button>
        ) : null}
        <Button type="button" disabled priority="secondary">
          Ajouter un service
        </Button>
      </div>

      <DataTable
        title="Liste des directions et services"
        hideCaption
        rowId="id"
        data={directionsServicesQuery.data?.data ?? []}
        columns={columns}
        cells={cells}
        isLoading={directionsServicesQuery.isFetching}
      />
    </section>
  );
}
