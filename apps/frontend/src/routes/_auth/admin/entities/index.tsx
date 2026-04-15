import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Link } from '@tanstack/react-router';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useEntitesAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/entities/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

function RouteComponent() {
  const entitesQuery = useEntitesAdmin({ offset: 0, limit: 20 });

  return (
    <div className="fr-container-fluid">
      <h1>Liste des entités administratives</h1>
      <QueryStateHandler query={entitesQuery} noDataComponent={<p>Aucune entité administrative à afficher.</p>}>
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
    </div>
  );
}
