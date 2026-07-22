import Button from '@codegouvfr/react-dsfr/Button';

import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useCallback, useEffect } from 'react';
import { useCreateDirectionAdminLocal } from '@/hooks/queries/entites.hook';
import {
  LocalDirectionServiceContactFields,
  LocalDirectionServiceSirenaFields,
} from './-components/LocalDirectionServiceSirenaFields';
import { useLocalDirectionServiceForm } from './-components/useLocalDirectionServiceForm';
import { requireAdminLocalDirectionCreation } from './-create-route-guard';

export const Route = createFileRoute('/_auth/admin/directions-services/directions/create')({
  beforeLoad: requireAdminLocalDirectionCreation,
  component: RouteComponent,
});

export function RouteComponent() {
  const form = useLocalDirectionServiceForm('direction');
  const router = useRouter();
  const createDirectionAdminLocal = useCreateDirectionAdminLocal();
  const toastManager = Toast.useToastManager();

  useEffect(() => {
    document.title = 'Ajouter une direction - Directions et services - SIRENA';
  }, []);

  const handleSubmit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const values = form.validate();
      if (!values) return;

      try {
        await createDirectionAdminLocal.mutateAsync(values);

        toastManager.add({
          title: 'Direction créée avec succès',
          description: 'La nouvelle direction a bien été enregistrée.',
          timeout: 0,
          data: { icon: 'fr-alert--success' },
        });

        await router.navigate({ to: '/admin/directions-services' });
      } catch {
        toastManager.add({
          title: 'Erreur',
          description: 'Erreur lors de la création de la direction. Veuillez réessayer.',
          timeout: 0,
          data: { icon: 'fr-alert--error' },
        });
      }
    },
    [form, createDirectionAdminLocal, toastManager, router],
  );

  return (
    <section>
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/directions-services">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Directions et services
        </Link>
      </div>

      <h2>Ajouter une direction</h2>

      <div className="fr-card fr-p-3w fr-mt-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <LocalDirectionServiceSirenaFields
            kind="direction"
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
            <Link className="fr-btn fr-btn--secondary" to="/admin/directions-services">
              Annuler
            </Link>
            <Button type="submit" disabled={createDirectionAdminLocal.isPending}>
              Ajouter la direction
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
