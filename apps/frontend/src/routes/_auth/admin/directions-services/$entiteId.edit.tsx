import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import { Loader, Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect } from 'react';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useDirectionServiceAdminLocal, useEditDirectionServiceAdminLocal } from '@/hooks/queries/entites.hook';
import {
  LocalDirectionServiceContactFields,
  LocalDirectionServiceSirenaFields,
} from './-components/LocalDirectionServiceSirenaFields';
import { useLocalDirectionServiceForm } from './-components/useLocalDirectionServiceForm';
import { requireAdminLocalDirectionsServices } from './-route-guard';

export const Route = createFileRoute('/_auth/admin/directions-services/$entiteId/edit')({
  beforeLoad: requireAdminLocalDirectionsServices,
  component: RouteComponent,
});

export function RouteComponent() {
  const { entiteId } = (Route.useParams as () => { entiteId: string })();
  const entiteQuery = useDirectionServiceAdminLocal(entiteId);

  if (entiteQuery.isPending) {
    return <Loader />;
  }

  if (entiteQuery.isError || !entiteQuery.data) {
    return <QueryErrorState message="Erreur lors du chargement." />;
  }

  return <LocalEditForm target={entiteQuery.data} />;
}

type LocalEditTarget = NonNullable<ReturnType<typeof useDirectionServiceAdminLocal>['data']>;

function LocalEditForm({ target }: { target: LocalEditTarget }) {
  const wording =
    target.kind === 'direction'
      ? {
          titlePrefix: 'Modifier la direction',
          successTitle: 'Direction modifiée avec succès',
          errorDescription: 'Erreur lors de la modification de la direction. Veuillez réessayer.',
        }
      : {
          titlePrefix: 'Modifier le service',
          successTitle: 'Service modifié avec succès',
          errorDescription: 'Erreur lors de la modification du service. Veuillez réessayer.',
        };
  const title = `${wording.titlePrefix} ${target.nomComplet}`;
  const editDirectionService = useEditDirectionServiceAdminLocal();
  const toastManager = Toast.useToastManager();
  const router = useRouter();
  const form = useLocalDirectionServiceForm(target.kind, {
    nomComplet: target.nomComplet,
    label: target.label,
    email: target.email,
    emailContactUsager: target.emailContactUsager,
    telContactUsager: target.telContactUsager,
    adresseContactUsager: target.adresseContactUsager,
  });

  useEffect(() => {
    document.title = `${title} - Directions et services - SIRENA`;
  }, [title]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = form.validate();
    if (!values) return;

    try {
      await editDirectionService.mutateAsync({ id: target.id, input: values });
      toastManager.add({
        title: wording.successTitle,
        description: 'Les modifications ont bien été enregistrées.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
      await router.navigate({ to: '/admin/directions-services' });
    } catch {
      toastManager.add({
        title: 'Erreur',
        description: wording.errorDescription,
        timeout: 0,
        data: { icon: 'fr-alert--error' },
      });
    }
  };

  return (
    <section>
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/directions-services">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Directions et services
        </Link>
      </div>

      <h2>{title}</h2>

      <div className="fr-card fr-p-3w fr-mt-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <LocalDirectionServiceSirenaFields
            kind={target.kind}
            formData={form.values}
            validationErrors={form.validationErrors}
            onChange={form.onChange}
            leadingField={
              target.kind === 'service' ? (
                <div className="fr-col-12 fr-col-md-7">
                  <Input
                    className="fr-fieldset__content"
                    label="Direction (obligatoire)"
                    hintText="Organisation à laquelle le service est rattaché"
                    nativeInputProps={{
                      name: 'parentDirection',
                      value: target.parentDirection
                        ? `${target.parentDirection.nomComplet} (${target.parentDirection.label})`
                        : '',
                      readOnly: true,
                    }}
                  />
                </div>
              ) : undefined
            }
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
            <Button type="submit" disabled={editDirectionService.isPending}>
              Valider les modifications
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
