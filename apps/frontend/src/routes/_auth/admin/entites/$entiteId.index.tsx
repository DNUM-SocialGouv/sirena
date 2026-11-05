import Button from '@codegouvfr/react-dsfr/Button';
import { ROLES } from '@sirena/common/constants';
import { optionalEmailSchema, optionalPhoneSchema } from '@sirena/common/schemas';
import { Loader, Toast } from '@sirena/ui';
import { createFileRoute, Link } from '@tanstack/react-router';
import { type SubmitEvent, useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { hasUnsavedChanges } from '@/components/unsavedChanges/hasUnsavedChanges';
import { useUnsavedChangesGuard } from '@/components/unsavedChanges/useUnsavedChangesGuard';
import { useEditEntiteAdmin, useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { notifySaveNetworkFailure } from '@/lib/api/saveError';
import { HttpError } from '@/lib/api/tanstackQuery';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { getFieldError, zodIssuesToFieldErrors } from '@/lib/zodFormValidation';
import { useListStateStore } from '@/stores/listStateStore';
import { BACK_LINK_ACTIVE_OPTIONS } from '@/utils/backLink';
import { EntiteAdminFormFields } from './-components/EntiteAdminFormFields';
import { getEditEntiteTitle } from './-helpers';

const EditEntiteFormSchema = z.object({
  nomComplet: z.string().trim().min(1, 'Le champ "Nom - libellé long" est vide. Veuillez le renseigner.'),
  label: z.string().trim().min(1, 'Le champ "Nom court" est vide. Veuillez le renseigner.'),
  email: optionalEmailSchema,
  emailContactUsager: optionalEmailSchema,
  adresseContactUsager: z.string().trim(),
  telContactUsager: optionalPhoneSchema,
  isActive: z.enum(['oui', 'non'], 'Le statut actif dans SIRENA est obligatoire. Veuillez sélectionner une option.'),
});

type EntiteFormData = {
  nomComplet: string;
  label: string;
  email: string;
  emailContactUsager: string;
  adresseContactUsager: string;
  telContactUsager: string;
  isActive: string;
};

const toFormData = (entite: NonNullable<ReturnType<typeof useEntiteByIdAdmin>['data']>): EntiteFormData => ({
  nomComplet: entite.nomComplet,
  label: entite.label,
  email: entite.email ?? '',
  emailContactUsager: entite.emailContactUsager ?? '',
  adresseContactUsager: entite.adresseContactUsager ?? '',
  telContactUsager: entite.telContactUsager ?? '',
  isActive: entite.isActive ? 'oui' : 'non',
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
  const entitesListSearch = useListStateStore((s) => s.states.entites?.search);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const entiteDepth = entiteChainQuery.data?.length ?? 0;
  const canCreateChild = !entiteChainQuery.isError && entiteDepth > 0 && entiteDepth < 3;
  const createChildLabel = entiteDepth === 1 ? 'Créer une direction' : 'Créer un service';
  const editTitlePrefix =
    entiteDepth === 1 ? 'Modifier l’entité' : entiteDepth === 2 ? 'Modifier la direction' : 'Modifier le service';

  const isSubmittingRef = useRef(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [formData, setFormData] = useState<EntiteFormData>({
    nomComplet: '',
    label: '',
    email: '',
    emailContactUsager: '',
    adresseContactUsager: '',
    telContactUsager: '',
    isActive: '',
  });
  const [savedData, setSavedData] = useState<EntiteFormData | null>(null);

  const isDirty = savedData !== null && hasUnsavedChanges(savedData, formData);
  useUnsavedChangesGuard({ isDirty });

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!entiteQuery.data) return;

    document.title = `${getEditEntiteTitle(entiteQuery.data.nomComplet)} - Gestion des entités - SIRENA`;
  }, [entiteQuery.data]);

  useEffect(() => {
    if (!entiteQuery.data || isDirtyRef.current) return;

    const serverData = toFormData(entiteQuery.data);

    setFormData(serverData);
    setSavedData(serverData);
  }, [entiteQuery.data]);

  const handleInputChange = useCallback(
    (field: keyof typeof formData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      },
    [hasSubmitted],
  );

  const handleSubmit = useCallback(
    async (e: SubmitEvent<HTMLFormElement>) => {
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
        const savedEntite = await editEntiteAdmin.mutateAsync({
          id: entiteId,
          input: {
            ...result.data,
            email: result.data.email ?? '',
            emailContactUsager: result.data.emailContactUsager ?? '',
            telContactUsager: result.data.telContactUsager ?? '',
            isActive: result.data.isActive === 'oui',
          },
        });

        setFormData(toFormData(savedEntite));
        setSavedData(toFormData(savedEntite));

        toastManager.add({
          title: 'Entité modifiée avec succès',
          description: 'Les modifications ont bien été enregistrées.',
          timeout: 0,
          data: { icon: 'fr-alert--success' },
        });
      } catch (error) {
        if (!(error instanceof HttpError)) notifySaveNetworkFailure();
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [editEntiteAdmin, formData, entiteId, toastManager],
  );

  if (entiteQuery.isPending || entiteChainQuery.isPending) {
    return (
      <div className="fr-container fr-mt-4w">
        <Loader />
      </div>
    );
  }

  if (entiteQuery.isError || entiteChainQuery.isError || !entiteQuery.data) {
    return (
      <div className="fr-container fr-mt-4w">
        <QueryErrorState message="Erreur lors du chargement de l’entité." />
      </div>
    );
  }

  return (
    <div className="fr-container fr-mt-4w">
      <div className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12 fr-col-md">
          <h2 className="fr-mb-0">{`${editTitlePrefix} ${entiteQuery.data.nomComplet}`}</h2>
        </div>

        {canCreateChild ? (
          <div className="fr-col-12 fr-col-md-auto">
            <Link className="fr-btn fr-btn--secondary" to="/admin/entites/$entiteId/create" params={{ entiteId }}>
              {createChildLabel}
            </Link>
          </div>
        ) : null}
      </div>

      <div className="fr-p-2w fr-p-md-4w fr-mb-4w fr-card">
        <form onSubmit={handleSubmit}>
          <p>Sauf mention contraire, les champs sont facultatifs.</p>

          <EntiteAdminFormFields
            formData={formData}
            validationErrors={validationErrors}
            onChange={handleInputChange}
            legend="Informations de l’entité"
          />

          <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-md">
            <Link
              className="fr-btn fr-btn--secondary"
              to="/admin/entites"
              search={entitesListSearch ?? {}}
              activeOptions={BACK_LINK_ACTIVE_OPTIONS}
              ignoreBlocker
            >
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
