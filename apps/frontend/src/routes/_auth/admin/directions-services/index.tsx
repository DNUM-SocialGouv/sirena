import { ROLES } from '@sirena/common/constants';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo } from 'react';
import { useDirectionsServicesRows } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/directions-services/')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const { data: profile } = useProfile();
  const directionsServicesQuery = useDirectionsServicesRows();
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

      <table>
        <thead>
          <tr>
            <th scope="col">Nom de la direction</th>
            <th scope="col">Libellé de la direction</th>
            <th scope="col">Nom du service</th>
            <th scope="col">Libellé du service</th>
            <th scope="col">Email</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {directionsServicesQuery.data?.data.map((row) => (
            <tr key={row.id}>
              <td>{row.directionNom}</td>
              <td>{row.directionLabel}</td>
              <td>{row.serviceNom}</td>
              <td>{row.serviceLabel}</td>
              <td>{row.email}</td>
              <td>
                <button type="button" disabled>
                  Modifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
