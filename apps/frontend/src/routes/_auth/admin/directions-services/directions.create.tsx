import Button from '@codegouvfr/react-dsfr/Button';

import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { useCreateDirectionAdminLocal } from '@/hooks/queries/entites.hook';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';
import {
  LocalDirectionServiceContactFields,
  LocalDirectionServiceSirenaFields,
} from './-components/LocalDirectionServiceSirenaFields';
import { requireAdminLocalDirectionCreation } from './-create-route-guard';

const CreateDirectionFormSchema = z.object({
  nomComplet: z.string().trim().min(1, 'Le champ "Nom de la direction" est vide. Veuillez le renseigner.'),
  label: z.string().trim().min(1, 'Le champ "Abréviation" est vide. Veuillez le renseigner.'),
  email: optionalEmailSchema,
  emailContactUsager: optionalEmailSchema,
  telContactUsager: optionalPhoneSchema,
  adresseContactUsager: z.string(),
});

export const Route = createFileRoute('/_auth/admin/directions-services/directions/create')({
  beforeLoad: requireAdminLocalDirectionCreation,
  component: RouteComponent,
});

export function RouteComponent() {
  const [formData, setFormData] = useState({
    nomComplet: '',
    label: '',
    email: '',
    emailContactUsager: '',
    telContactUsager: '',
    adresseContactUsager: '',
  });
  const router = useRouter();
  const createDirectionAdminLocal = useCreateDirectionAdminLocal();
  const toastManager = Toast.useToastManager();
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Ajouter une direction - Directions et services - SIRENA';
  }, []);

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;

      setFormData((prev) => {
        const updatedData = { ...prev, [field]: value };

        if (hasSubmitted && validationErrors[field]) {
          const fieldError = getFieldError(CreateDirectionFormSchema, updatedData, field);

          setValidationErrors((prevErrors) => {
            const next = { ...prevErrors };

            if (fieldError) {
              next[field] = fieldError;
            } else {
              delete next[field];
            }

            return next;
          });
        }

        return updatedData;
      });
    };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasSubmitted(true);

    const result = CreateDirectionFormSchema.safeParse(formData);

    if (!result.success) {
      const errors = zodIssuesToFieldErrors(result.error);
      setValidationErrors(errors);

      const firstField = Object.keys(errors)[0];
      document.querySelector<HTMLElement>(`[name="${firstField}"]`)?.focus();
      return;
    }

    setValidationErrors({});

    try {
      await createDirectionAdminLocal.mutateAsync({
        nomComplet: result.data.nomComplet,
        label: result.data.label,
        email: result.data.email ?? '',
        emailContactUsager: result.data.emailContactUsager ?? '',
        telContactUsager: result.data.telContactUsager ?? '',
        adresseContactUsager: result.data.adresseContactUsager,
      });

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
  };

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
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleInputChange}
          />

          <LocalDirectionServiceContactFields
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleInputChange}
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
