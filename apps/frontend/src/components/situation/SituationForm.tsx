import { Button } from '@codegouvfr/react-dsfr/Button';
import type { ReceptionType } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import { MisEnCause } from '@/components/situation/sections/MisEnCause';
import { hasUnsavedChanges } from '@/components/unsavedChanges/hasUnsavedChanges';
import { useUnsavedChangesGuard } from '@/components/unsavedChanges/useUnsavedChangesGuard';
import { useEntites } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { hasSituationContent } from '@/utils/situationHelpers';
import { DescriptionFaits, type DescriptionFaitsRef } from './sections/DescriptionSituation';
import { Identification } from './sections/Identification';
import { InformationsComplementaires } from './sections/InformationsComplementaires';
import { LieuSurvenu } from './sections/LieuSurvenu';
import TraitementDesFaitsSection, { type TraitementDesFaitsSectionRef } from './TraitementDesFaits';

interface SituationFormProps {
  mode: 'create' | 'edit';
  requestId?: string;
  situationId?: string;
  initialData?: SituationData;
  receptionType?: ReceptionType;
  isFromSirec?: boolean;
  sirecDepartement?: string | null;
  onSave: (
    data: SituationData,
    shouldCreateRequest: boolean,
    faitFiles: File[],
    initialFileIds?: string[],
    initialFiles?: Array<{ id: string; entiteId?: string | null }>,
  ) => Promise<void>;
  saveButtonRef?: React.RefObject<HTMLButtonElement | null>;
  savedVersion?: number;
}

export function SituationForm({
  mode,
  requestId,
  situationId,
  initialData,
  receptionType,
  isFromSirec,
  sirecDepartement,
  onSave,
  saveButtonRef: externalSaveButtonRef,
  savedVersion = 0,
}: SituationFormProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const internalSaveButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = externalSaveButtonRef || internalSaveButtonRef;
  const descriptionFaitsRef = useRef<DescriptionFaitsRef>(null);
  const traitementDesFaitsRef = useRef<TraitementDesFaitsSectionRef>(null);
  const [formData, setFormData] = useState<SituationData>(initialData || {});
  const [savedData, setSavedData] = useState<SituationData>(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [faitFiles, setFaitFiles] = useState<File[]>([]);
  const [savedFaitFiles, setSavedFaitFiles] = useState<File[]>([]);
  const [seenSavedVersion, setSeenSavedVersion] = useState(savedVersion);
  const [isTraitementDesFaitsValid, setIsTraitementDesFaitsValid] = useState(true);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const { data: entitesData } = useEntites(undefined);
  const { data: profile } = useProfile();

  if (savedVersion !== seenSavedVersion) {
    setSeenSavedVersion(savedVersion);
    setSavedData(formData);
    setSavedFaitFiles(faitFiles);
  }

  const haveFaitFilesChanged =
    faitFiles.length !== savedFaitFiles.length || faitFiles.some((file, index) => file !== savedFaitFiles[index]);

  useUnsavedChangesGuard({ isDirty: haveFaitFilesChanged || hasUnsavedChanges(savedData, formData) });

  const handleTraitementDesFaitsChange = useCallback(
    (
      data: { entites: Array<{ entiteId: string; directionServiceId?: string }> },
      { isUserChange }: { isUserChange: boolean },
    ) => {
      const traitementDesFaits = {
        entites: data.entites.map((e) => ({
          entiteId: e.entiteId,
          directionServiceId: e.directionServiceId,
        })),
      };

      setFormData((prev) => ({ ...prev, traitementDesFaits }));

      // The entities the section prefills are not the user's input: leaving loses nothing.
      if (!isUserChange) setSavedData((prev) => ({ ...prev, traitementDesFaits }));
    },
    [],
  );
  const handleCancel = useCallback(() => {
    if (mode === 'create' && !requestId) {
      navigate({ to: '/request/create', ignoreBlocker: true });
    } else if (requestId) {
      navigate({ to: '/request/$requestId', params: { requestId }, ignoreBlocker: true });
    } else {
      router.history.back({ ignoreBlocker: true });
    }
  }, [mode, requestId, navigate, router]);

  const handleSave = useCallback(async () => {
    setHasAttemptedSave(true);

    const areDatesValid = descriptionFaitsRef.current?.validateAndFocusFirstError() ?? true;
    if (!areDatesValid) {
      return;
    }

    if (!isTraitementDesFaitsValid) {
      // Move focus to the first field in error (the entity combobox)
      traitementDesFaitsRef.current?.focusFirstError();
      return;
    }

    setIsSaving(true);
    try {
      if (!hasSituationContent(formData, faitFiles)) {
        handleCancel();
        return;
      }

      const shouldCreateRequest = mode === 'create' && !requestId;
      const initialFileIds = initialData?.fait?.fileIds;
      const initialFiles = initialData?.fait?.files || [];
      await onSave(formData, shouldCreateRequest, faitFiles, initialFileIds, initialFiles);
    } finally {
      setIsSaving(false);
    }
  }, [isTraitementDesFaitsValid, formData, faitFiles, handleCancel, mode, requestId, initialData, onSave]);

  return (
    <div>
      <h1 className="fr-mb-2w" data-testid="situation-form-title">
        Description de la situation
      </h1>
      <p className="fr-text--sm fr-mb-5w">Sauf mention contraire, les champs sont facultatifs.</p>

      <LieuSurvenu formData={formData} isSaving={isSaving} receptionType={receptionType} setFormData={setFormData} />

      <MisEnCause formData={formData} isSaving={isSaving} setFormData={setFormData} />

      <DescriptionFaits
        ref={descriptionFaitsRef}
        formData={formData}
        setFormData={setFormData}
        receptionType={receptionType}
        initialData={initialData}
      />

      <InformationsComplementaires
        formData={formData}
        setFormData={setFormData}
        situationId={situationId}
        requestId={requestId}
        faitFiles={faitFiles}
        setFaitFiles={setFaitFiles}
        isSaving={isSaving}
      />

      <Identification
        formData={formData}
        isSaving={isSaving}
        setFormData={setFormData}
        isFromSirec={isFromSirec}
        sirecDepartement={sirecDepartement}
      />

      <TraitementDesFaitsSection
        ref={traitementDesFaitsRef}
        entites={(entitesData?.data || []).map((e: { id: string; nomComplet: string }) => ({
          id: e.id,
          nomComplet: e.nomComplet,
        }))}
        userEntiteId={profile?.entiteId}
        topEntiteId={profile?.topEntiteId}
        initialEntites={formData.traitementDesFaits?.entites}
        onChange={handleTraitementDesFaitsChange}
        onValidationChange={setIsTraitementDesFaitsValid}
        disabled={isSaving}
        hasAttemptedSave={hasAttemptedSave}
      />

      {/* Actions */}
      <div className="fr-btns-group fr-btns-group--inline-md fr-mb-6w">
        <Button priority="secondary" onClick={handleCancel} disabled={isSaving}>
          Annuler
        </Button>
        <Button
          ref={saveButtonRef}
          onClick={handleSave}
          disabled={isSaving}
          nativeButtonProps={{ ...{ 'data-testid': 'situation-save' } }}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
