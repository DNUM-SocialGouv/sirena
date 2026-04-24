import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { ROLES } from '@sirena/common/constants';
import { Toast } from '@sirena/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { type SubmitEvent, useState } from 'react';
import { z } from 'zod';
import { useEditEntiteAdmin, useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { zodIssuesToFieldErrors } from '@/lib/zodFormValidation';

const EditEntiteFormSchema = z.object({
  nomComplet: z.string().trim().min(1, 'Le nom est obligatoire.'),
  label: z.string().trim().min(1, 'Le libellé est obligatoire.'),
  isActive: z.enum(['oui', 'non'], 'Le statut actif dans SIRENA est obligatoire.'),
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

  if (entiteQuery.isPending) {
    return null;
  }

  if (entiteQuery.isError || !entiteQuery.data) {
    return null;
  }

  const entite = entiteQuery.data;

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const validationResult = EditEntiteFormSchema.safeParse({
      nomComplet: String(formData.get('nomComplet') ?? ''),
      label: String(formData.get('label') ?? ''),
      isActive: String(formData.get('isActive') ?? ''),
    });

    if (!validationResult.success) {
      setValidationErrors(zodIssuesToFieldErrors(validationResult.error));
      return;
    }

    setValidationErrors({});

    await editEntiteAdmin.mutateAsync({
      id: entiteId,
      input: {
        ...validationResult.data,
        isActive: validationResult.data.isActive === 'oui',
      },
    });

    toastManager.add({
      title: 'Entité modifiée avec succès',
      description: 'Les modifications ont bien été enregistrées.',
      timeout: 0,
      data: { icon: 'fr-alert--success' },
    });
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

      <div
        className="fr-p-4w fr-mb-4w"
        style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Informations de l’entité</legend>

            <Input
              className="fr-fieldset__content"
              label="Nom de l'entité"
              state={validationErrors.nomComplet ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.nomComplet}
              nativeInputProps={{
                name: 'nomComplet',
                defaultValue: entite.nomComplet,
              }}
            />

            <Input
              className="fr-fieldset__content"
              label="Libellé de l'entité"
              state={validationErrors.label ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.label}
              nativeInputProps={{
                name: 'label',
                defaultValue: entite.label,
              }}
            />

            <Select
              className="fr-fieldset__content"
              label="Actif dans SIRENA"
              state={validationErrors.isActive ? 'error' : 'default'}
              stateRelatedMessage={validationErrors.isActive}
              nativeSelectProps={{
                name: 'isActive',
                defaultValue: entite.isActive ? 'oui' : 'non',
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
