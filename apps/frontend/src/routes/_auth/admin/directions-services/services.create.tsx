import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useState } from 'react';
import { useCreateServiceAdminLocal, useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { LocalEntiteFormFields } from '../-components/LocalEntiteFormFields';
import { useLocalEntiteForm } from '../-components/useLocalEntiteForm';
import { requireAdminLocalServiceCreation } from './-create-route-guard';

export const Route = createFileRoute('/_auth/admin/directions-services/services/create')({
  beforeLoad: requireAdminLocalServiceCreation,
  component: RouteComponent,
});

export function RouteComponent() {
  const form = useLocalEntiteForm('service');
  const [directionId, setDirectionId] = useState('');
  const createServiceAdminLocal = useCreateServiceAdminLocal();
  const directionsServicesQuery = useDirectionsServicesList();
  const capabilities = directionsServicesQuery.data?.capabilities;
  const availableDirections = directionsServicesQuery.data?.availableDirections ?? [];
  const serviceParentDirection = directionsServicesQuery.data?.serviceParentDirection;
  const requiresDirectionSelection = capabilities?.canCreateDirection ?? false;
  const canCreateService = capabilities?.canCreateService ?? false;
  const router = useRouter();
  const toastManager = Toast.useToastManager();

  useEffect(() => {
    document.title = 'Ajouter un service - Directions et services - SIRENA';
  }, []);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = form.validate(
      requiresDirectionSelection && !directionId
        ? { directionId: 'Veuillez sélectionner la direction à laquelle rattacher le service.' }
        : {},
    );
    if (!values) return;

    try {
      await createServiceAdminLocal.mutateAsync({
        ...values,
        ...(requiresDirectionSelection ? { directionId } : {}),
      });

      toastManager.add({
        title: 'Service créé avec succès',
        description: 'Le nouveau service a bien été enregistré.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
      await router.navigate({ to: '/admin/directions-services' });
    } catch {
      toastManager.add({
        title: 'Erreur',
        description: 'Erreur lors de la création du service. Veuillez réessayer.',
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

      <h2>Ajouter un service</h2>

      <div className="fr-card fr-p-3w fr-mt-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <LocalEntiteFormFields
            form={form}
            leadingField={
              <div className="fr-col-12 fr-col-md-7">
                {requiresDirectionSelection ? (
                  <Select
                    className="fr-fieldset__content"
                    label="Direction (obligatoire)"
                    hint="Organisation à laquelle le service est rattaché"
                    state={form.validationErrors.directionId ? 'error' : 'default'}
                    stateRelatedMessage={form.validationErrors.directionId}
                    nativeSelectProps={{
                      name: 'directionId',
                      value: directionId,
                      onChange: (event) => {
                        setDirectionId(event.target.value);
                        form.clearError('directionId');
                      },
                    }}
                  >
                    <option value="" disabled>
                      Sélectionner une option
                    </option>
                    {availableDirections.map((direction) => (
                      <option key={direction.id} value={direction.id}>
                        {direction.nomComplet} ({direction.label})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    className="fr-fieldset__content"
                    label="Direction (obligatoire)"
                    hintText="Organisation à laquelle le service est rattaché"
                    nativeInputProps={{
                      name: 'serviceParentDirection',
                      value: serviceParentDirection
                        ? `${serviceParentDirection.nomComplet} (${serviceParentDirection.label})`
                        : '',
                      readOnly: true,
                    }}
                  />
                )}
              </div>
            }
          />

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link className="fr-btn fr-btn--secondary" to="/admin/directions-services">
              Annuler
            </Link>
            <Button type="submit" disabled={createServiceAdminLocal.isPending || !canCreateService}>
              Ajouter le service
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
