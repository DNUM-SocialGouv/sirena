import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { ROLES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { useEditEntiteAdmin, useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';
import { getEditEntiteTitle } from './-helpers';

const EditEntiteFormSchema = z.object({
  nomComplet: z.string().trim().min(1, 'Le champ "Nom de l’entité" est vide. Veuillez le renseigner.'),
  label: z.string().trim().min(1, 'Le champ "Libellé de l’entité" est vide. Veuillez le renseigner.'),
  isActive: z.enum(['oui', 'non'], 'Le statut actif dans SIRENA est obligatoire. Veuillez sélectionner une option.'),
});

export const Route = createFileRoute('/_auth/admin/entites/$entiteId/')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const { entiteId } = (Route.useParams as () => { entiteId: string })();
  const toastManager = Toast.useToastManager();
  const editEntiteAdmin = useEditEntiteAdmin();
  const entiteQuery = useEntiteByIdAdmin(entiteId);
  const entiteChainQuery = useEntiteChain(entiteId);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const entiteDepth = entiteChainQuery.data?.length ?? 0;
  const canCreateChild = !entiteChainQuery.isError && entiteDepth > 0 && entiteDepth < 3;
  const createChildLabel = entiteDepth === 1 ? 'Créer une direction' : 'Créer un service';

  const isSubmittingRef = useRef(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    nomComplet: '',
    label: '',
    isActive: '',
  });

  useEffect(() => {
    if (!entiteQuery.data) return;

    document.title = `${getEditEntiteTitle(entiteQuery.data.nomComplet)} - Gestion des entités - SIRENA`;
  }, [entiteQuery.data]);

  useEffect(() => {
    if (!entiteQuery.data) return;

    setFormData({
      nomComplet: entiteQuery.data.nomComplet,
      label: entiteQuery.data.label,
      isActive: entiteQuery.data.isActive ? 'oui' : 'non',
    });
  }, [entiteQuery.data]);

  if (entiteQuery.isPending || entiteChainQuery.isPending) return null;

  if (entiteQuery.isError || entiteChainQuery.isError || !entiteQuery.data) return null;

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;

      setFormData((prev) => {
        const updated = { ...prev, [field]: value };

        if (hasSubmitted) {
          const fieldError = getFieldError(EditEntiteFormSchema, updated, field);

          setValidationErrors((prevErrors) => {
            const next = { ...prevErrors };

            if (fieldError) next[field] = fieldError;
            else delete next[field];

            return next;
          });
        }

        return updated;
      });
    };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmittingRef.current || editEntiteAdmin.isPending) return;

    setHasSubmitted(true);

    const result = EditEntiteFormSchema.safeParse(formData);

    if (!result.success) {
      const errors = zodIssuesToFieldErrors(result.error);
      setValidationErrors(errors);

      const firstField = Object.keys(errors)[0];

      const el = document.querySelector<HTMLElement>(`[name="${firstField}"]`);
      el?.focus?.();

      return;
    }

    setValidationErrors({});
    isSubmittingRef.current = true;

    try {
      await editEntiteAdmin.mutateAsync({
        id: entiteId,
        input: {
          ...result.data,
          isActive: result.data.isActive === 'oui',
        },
      });

      toastManager.add({
        title: 'Entité modifiée avec succès',
        description: 'Les modifications ont bien été enregistrées.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fr-container fr-mt-4w">
      <div className="fr-mb-3w">
        <Link className="fr-link" to="/admin/entites">
          <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
          Liste des entités
        </Link>
      </div>

      <div className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12 fr-col-md">
          <h2 className="fr-mb-0">Modifier une entité</h2>
        </div>

        {canCreateChild ? (
          <div className="fr-col-12 fr-col-md-auto">
            <Link className="fr-btn fr-btn--secondary" to="/admin/entites/$entiteId/create" params={{ entiteId }}>
              {createChildLabel}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="fr-p-4w fr-mb-4w fr-card">
        <form onSubmit={handleSubmit}>
          <p>Tous les champs sont obligatoires.</p>

          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Informations de l’entité</legend>

            <Input
              className="fr-fieldset__content"
              label="Nom de l'entité"
              state={validationErrors.nomComplet ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.nomComplet}
              nativeInputProps={{
                name: 'nomComplet',
                value: formData.nomComplet,
                onChange: handleInputChange('nomComplet'),
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Libellé de l'entité"
              state={validationErrors.label ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.label}
              nativeInputProps={{
                name: 'label',
                value: formData.label,
                onChange: handleInputChange('label'),
              }}
            />

            <Select
              className="fr-fieldset__content"
              label="Actif dans SIRENA"
              state={validationErrors.isActive ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.isActive}
              nativeSelectProps={{
                name: 'isActive',
                value: formData.isActive,
                onChange: handleInputChange('isActive'),
              }}
            >
              <option value="" disabled>
                Sélectionnez une option
              </option>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </Select>
          </fieldset>

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link className="fr-btn fr-btn--secondary" to="/admin/entites">
              Annuler
            </Link>
            <Button type="submit" disabled={editEntiteAdmin.isPending}>
              Valider les modifications
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
