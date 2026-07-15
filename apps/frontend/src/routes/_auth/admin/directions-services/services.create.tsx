import Button from '@codegouvfr/react-dsfr/Button';
import Select from '@codegouvfr/react-dsfr/Select';
import { optionalEmailSchema } from '@sirena/common/schemas';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { useCreateServiceAdminLocal, useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';
import { LocalDirectionServiceSirenaFields } from './-components/LocalDirectionServiceSirenaFields';
import { requireAdminLocalDirectionsServices } from './-route-guard';

const CreateServiceFormSchema = z.object({
  nomComplet: z.string().trim().min(1, 'Le champ "Nom du service" est vide. Veuillez le renseigner.'),
  label: z.string().trim().min(1, 'Le champ "Abréviation" est vide. Veuillez le renseigner.'),
  email: optionalEmailSchema,
  isActive: z.enum(['oui', 'non']),
  directionId: z.string(),
});

export const Route = createFileRoute('/_auth/admin/directions-services/services/create')({
  beforeLoad: requireAdminLocalDirectionsServices,
  component: RouteComponent,
});

export function RouteComponent() {
  const [formData, setFormData] = useState({
    nomComplet: '',
    label: '',
    email: '',
    isActive: 'oui',
    directionId: '',
  });
  const createServiceAdminLocal = useCreateServiceAdminLocal();
  const directionsServicesQuery = useDirectionsServicesList();
  const capabilities = directionsServicesQuery.data?.capabilities;
  const availableDirections = directionsServicesQuery.data?.availableDirections ?? [];
  const requiresDirectionSelection = availableDirections.length > 0;
  const canCreateService = capabilities?.canCreateService ?? false;
  const router = useRouter();
  const toastManager = Toast.useToastManager();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Créer un service - Directions et services - SIRENA';
  }, []);

  const handleInputChange =
    (field: 'nomComplet' | 'label' | 'email') => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setFormData((previous) => {
        const updatedData = { ...previous, [field]: value };

        if (hasSubmitted && validationErrors[field]) {
          const fieldError = getFieldError(CreateServiceFormSchema, updatedData, field);
          setValidationErrors((previousErrors) => {
            const next = { ...previousErrors };
            if (fieldError) next[field] = fieldError;
            else delete next[field];
            return next;
          });
        }

        return updatedData;
      });
    };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);

    const result = CreateServiceFormSchema.safeParse(formData);

    if (requiresDirectionSelection && !formData.directionId) {
      const errors = {
        directionId: 'La Direction de rattachement est obligatoire. Veuillez sélectionner une Direction.',
      };
      setValidationErrors(errors);
      document.querySelector<HTMLElement>('[name="directionId"]')?.focus();
      return;
    }

    if (!result.success) {
      const errors = zodIssuesToFieldErrors(result.error);
      setValidationErrors(errors);
      const firstField = Object.keys(errors)[0];
      document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }

    setValidationErrors({});

    try {
      await createServiceAdminLocal.mutateAsync({
        nomComplet: result.data.nomComplet,
        label: result.data.label,
        email: result.data.email ?? '',
        isActive: result.data.isActive === 'oui',
        ...(requiresDirectionSelection ? { directionId: result.data.directionId } : {}),
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

      <h2>Créer un service</h2>

      <div className="fr-card fr-p-3w fr-mt-4w">
        <form onSubmit={handleSubmit}>
          <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

          <LocalDirectionServiceSirenaFields
            kind="service"
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleInputChange}
          />

          {requiresDirectionSelection ? (
            <fieldset className="fr-fieldset fr-mb-3w">
              <Select
                className="fr-fieldset__content"
                label="Direction de rattachement (obligatoire)"
                state={validationErrors.directionId ? 'error' : 'default'}
                stateRelatedMessage={validationErrors.directionId}
                nativeSelectProps={{
                  name: 'directionId',
                  value: formData.directionId,
                  onChange: (event) => {
                    setFormData((previous) => ({ ...previous, directionId: event.target.value }));
                    setValidationErrors((previous) => {
                      const next = { ...previous };
                      delete next.directionId;
                      return next;
                    });
                  },
                }}
              >
                <option value="" disabled>
                  Sélectionnez une Direction
                </option>
                {availableDirections.map((direction) => (
                  <option key={direction.id} value={direction.id}>
                    {direction.nomComplet} ({direction.label})
                  </option>
                ))}
              </Select>
            </fieldset>
          ) : null}

          <fieldset className="fr-fieldset fr-mb-3w">
            <Select
              className="fr-fieldset__content"
              label="Actif dans SIRENA (obligatoire)"
              state={validationErrors.isActive ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.isActive}
              nativeSelectProps={{
                name: 'isActive',
                value: formData.isActive,
                onChange: (event) => setFormData((previous) => ({ ...previous, isActive: event.target.value })),
              }}
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </Select>
          </fieldset>

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
