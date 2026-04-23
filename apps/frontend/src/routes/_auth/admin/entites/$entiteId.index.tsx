import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import { RadioButtons } from '@codegouvfr/react-dsfr/RadioButtons';
import { ROLES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import type { SubmitEvent } from 'react';
import { useEditEntiteAdmin, useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';

export const Route = createFileRoute('/_auth/admin/entites/$entiteId/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const router = useRouter();
  const { entiteId } = Route.useParams();
  const toastManager = Toast.useToastManager();
  const editEntiteAdmin = useEditEntiteAdmin();
  const entiteQuery = useEntiteByIdAdmin(entiteId);
  const entiteChainQuery = useEntiteChain(entiteId);

  const canCreateChild =
    !entiteChainQuery.isError && (entiteChainQuery.data?.length ?? 0) > 0 && (entiteChainQuery.data?.length ?? 0) < 3;

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

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
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
    <div className="fr-container fr-mt-4w">
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/entites">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Liste des entités
        </Link>
      </div>

      <h1 className="fr-mb-4w">Modifier une entité</h1>

      <div
        className="fr-p-4w fr-mb-4w"
        style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
      >
        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <h2 className="fr-h6 fr-mb-3w">Informations de l’entité</h2>
            </legend>

            <Input
              className="fr-fieldset__content"
              label="Nom de l'entité"
              nativeInputProps={{
                name: 'nomComplet',
                defaultValue: entite.nomComplet,
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Libellé de l'entité"
              nativeInputProps={{
                name: 'label',
                defaultValue: entite.label,
              }}
            />

            <RadioButtons
              legend="Actif dans SIRENA"
              name="isActive"
              orientation="horizontal"
              options={[
                {
                  label: 'Oui',
                  nativeInputProps: {
                    value: 'oui',
                    defaultChecked: entite.isActive,
                  },
                },
                {
                  label: 'Non',
                  nativeInputProps: {
                    value: 'non',
                    defaultChecked: !entite.isActive,
                  },
                },
              ]}
            />
          </fieldset>

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            {canCreateChild ? (
              <Link className="fr-btn fr-btn--secondary" to="/admin/entites/$entiteId/create" params={{ entiteId }}>
                Créer une entité / sous-entité
              </Link>
            ) : null}

            <Button type="submit">Valider les modifications</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
