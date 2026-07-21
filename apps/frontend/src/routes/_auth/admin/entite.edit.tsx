import Button from '@codegouvfr/react-dsfr/Button';
import { Loader, Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useCallback, useEffect } from 'react';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useEditEntiteAdministrativeAdminLocal, useEntiteAdministrativeAdminLocal } from '@/hooks/queries/entites.hook';
import { LocalEntiteContactFields, LocalEntiteSirenaFields } from './-components/LocalEntiteFormFields';
import { useLocalEntiteForm } from './-components/useLocalEntiteForm';

export const Route = createFileRoute('/_auth/admin/entite/edit')({
  component: RouteComponent,
});

export function RouteComponent() {
  const entiteQuery = useEntiteAdministrativeAdminLocal();

  if (entiteQuery.isPending) {
    return <Loader />;
  }

  if (entiteQuery.isError || !entiteQuery.data) {
    return <QueryErrorState message="Erreur lors du chargement de l’entité." />;
  }

  return <EntiteAdministrativeEditForm entite={entiteQuery.data} />;
}

type AssignedEntite = NonNullable<ReturnType<typeof useEntiteAdministrativeAdminLocal>['data']>;

function EntiteAdministrativeEditForm({ entite }: { entite: AssignedEntite }) {
  const title = `Modifier l’entité administrative ${entite.nomComplet}`;
  const editEntite = useEditEntiteAdministrativeAdminLocal();
  const toastManager = Toast.useToastManager();
  const router = useRouter();
  const form = useLocalEntiteForm('entite-administrative', {
    nomComplet: entite.nomComplet,
    label: entite.label,
    email: entite.email,
    emailContactUsager: entite.emailContactUsager,
    telContactUsager: entite.telContactUsager,
    adresseContactUsager: entite.adresseContactUsager,
  });

  useEffect(() => {
    document.title = `${title} - Espace administrateur - SIRENA`;
  }, [title]);

  const handleSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const values = form.validate();
      if (!values) return;

      try {
        const { email, emailContactUsager, telContactUsager, adresseContactUsager } = values;
        await editEntite.mutateAsync({ email, emailContactUsager, telContactUsager, adresseContactUsager });
        toastManager.add({
          title: 'Entité administrative modifiée avec succès',
          description: 'Les modifications ont bien été enregistrées.',
          timeout: 0,
          data: { icon: 'fr-alert--success' },
        });
        await router.navigate({ to: '/admin/entite' });
      } catch {
        toastManager.add({
          title: 'Erreur',
          description: 'Erreur lors de la modification de l’entité administrative. Veuillez réessayer.',
          timeout: 0,
          data: { icon: 'fr-alert--error' },
        });
      }
    },
    [editEntite, form, router, toastManager],
  );

  return (
    <section>
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/entite">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Entités
        </Link>
      </div>

      <h2>{title}</h2>

      <div className="fr-card fr-p-3w fr-mt-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <LocalEntiteSirenaFields
            kind="entite-administrative"
            formData={form.values}
            validationErrors={form.validationErrors}
            onChange={form.onChange}
            identityFieldsDisabled
          />

          <LocalEntiteContactFields
            formData={form.values}
            validationErrors={form.validationErrors}
            onChange={form.onChange}
          />

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link className="fr-btn fr-btn--secondary" to="/admin/entite">
              Annuler
            </Link>
            <Button type="submit" disabled={editEntite.isPending}>
              Valider les modifications
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
