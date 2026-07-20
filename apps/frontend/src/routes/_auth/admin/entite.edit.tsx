import Button from '@codegouvfr/react-dsfr/Button';
import { Loader } from '@sirena/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { type SubmitEvent, useCallback, useEffect } from 'react';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useEntiteAdministrativeAdminLocal } from '@/hooks/queries/entites.hook';
import {
  LocalDirectionServiceContactFields,
  LocalDirectionServiceSirenaFields,
} from './directions-services/-components/LocalDirectionServiceSirenaFields';
import { useLocalDirectionServiceForm } from './directions-services/-components/useLocalDirectionServiceForm';

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
  const form = useLocalDirectionServiceForm('entite-administrative', {
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
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      form.validate();
    },
    [form],
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

          <LocalDirectionServiceSirenaFields
            kind="entite-administrative"
            formData={form.values}
            validationErrors={form.validationErrors}
            onChange={form.onChange}
          />

          <LocalDirectionServiceContactFields
            formData={form.values}
            validationErrors={form.validationErrors}
            onChange={form.onChange}
          />

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link className="fr-btn fr-btn--secondary" to="/admin/entite">
              Annuler
            </Link>
            <Button type="submit">Valider les modifications</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
