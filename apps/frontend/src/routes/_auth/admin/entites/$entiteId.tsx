import { ROLES } from '@sirena/common/constants';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEntiteByIdAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/entites/$entiteId')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const { entiteId } = Route.useParams();
  const entiteQuery = useEntiteByIdAdmin(entiteId);

  if (entiteQuery.isPending) {
    return null;
  }

  if (entiteQuery.isError || !entiteQuery.data) {
    return null;
  }

  const entite = entiteQuery.data;

  return (
    <div>
      <Link to="/admin/entites">Liste des entités</Link>

      <h1>Éditer une entité</h1>

      <label>
        Nom (libellé long)
        <input defaultValue={entite.nomComplet} />
      </label>

      <label>
        Nom court
        <input defaultValue={entite.label} />
      </label>

      <fieldset>
        <legend>Actif dans SIRENA</legend>

        <label>
          <input type="radio" name="isActive" value="oui" defaultChecked={entite.isActive} />
          Oui
        </label>

        <label>
          <input type="radio" name="isActive" value="non" defaultChecked={!entite.isActive} />
          Non
        </label>
      </fieldset>
    </div>
  );
}
