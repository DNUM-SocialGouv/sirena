import { ROLES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useEditEntiteAdmin, useEntiteByIdAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/entites/$entiteId')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const router = useRouter();
  const { entiteId } = Route.useParams();
  const editEntiteAdmin = useEditEntiteAdmin();
  const entiteQuery = useEntiteByIdAdmin(entiteId);
  const toastManager = Toast.useToastManager();

  if (entiteQuery.isPending) {
    return null;
  }

  if (entiteQuery.isError || !entiteQuery.data) {
    return null;
  }

  const entite = entiteQuery.data;

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: '/admin/entites' });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    await editEntiteAdmin.mutateAsync({
      id: entiteId,
      input: {
        nomComplet: String(formData.get('nomComplet') ?? ''),
        label: String(formData.get('label') ?? ''),
        isActive: formData.get('isActive') === 'oui',
      },
    });

    toastManager.add({
      title: 'Entité modifiée',
      description: 'Les modifications ont été enregistrées avec succès.',
      timeout: 0,
      data: { icon: 'fr-alert--success' },
    });

    handleBack();
  };

  return (
    <div>
      <Link to="/admin/entites">Liste des entités</Link>

      <h1>Éditer une entité</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Nom (libellé long)
          <input name="nomComplet" defaultValue={entite.nomComplet} />
        </label>

        <label>
          Nom court
          <input name="label" defaultValue={entite.label} />
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

        <button type="submit">Valider les modifications</button>
      </form>
    </div>
  );
}
