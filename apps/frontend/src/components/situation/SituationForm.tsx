import { Button } from '@codegouvfr/react-dsfr/Button';
import type { ReceptionType } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import { MisEnCause } from '@/components/situation/sections/MisEnCause';
import { useEntites } from '@/hooks/queries/entites.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { hasSituationContent } from '@/utils/situationHelpers';
import { AttachedFiles } from './sections/AttachedFiles';
import { DemarchesEngagees } from './sections/DemarchesEngagees';
import { DescriptionFaits } from './sections/DescriptionFaits';
import { LieuSurvenu } from './sections/LieuSurvenu';
import TraitementDesFaitsSection from './TraitementDesFaits';

interface SituationFormProps {
  mode: 'create' | 'edit';
  requestId?: string;
  situationId?: string;
  initialData?: SituationData;
  receptionType?: ReceptionType;
  onSave: (
    data: SituationData,
    shouldCreateRequest: boolean,
    faitFiles: File[],
    initialFileIds?: string[],
    initialFiles?: Array<{ id: string; entiteId?: string | null }>,
  ) => Promise<void>;
  saveButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function SituationForm({
  mode,
  requestId,
  situationId,
  initialData,
  receptionType,
  onSave,
  saveButtonRef: externalSaveButtonRef,
}: SituationFormProps) {
  const navigate = useNavigate();
  const internalSaveButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = externalSaveButtonRef || internalSaveButtonRef;
  const [formData, setFormData] = useState<SituationData>(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [faitFiles, setFaitFiles] = useState<File[]>([]);
  const [isTraitementDesFaitsValid, setIsTraitementDesFaitsValid] = useState(true);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const { data: entitesData } = useEntites(undefined);
  const { data: profile } = useProfile();

  const handleTraitementDesFaitsChange = useCallback(
    (data: { entites: Array<{ entiteId: string; directionServiceId?: string }> }) => {
      setFormData((prev) => ({
        ...prev,
        traitementDesFaits: {
          entites: data.entites.map((e) => ({
            entiteId: e.entiteId,
            directionServiceId: e.directionServiceId,
          })),
        },
      }));
    },
    [],
  );
  const handleSave = async () => {
    setHasAttemptedSave(true);

    if (!isTraitementDesFaitsValid) {
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
  };

  const handleCancel = () => {
    if (mode === 'create' && !requestId) {
      navigate({ to: '/request/create' });
    } else if (requestId) {
      navigate({ to: '/request/$requestId', params: { requestId } });
    } else {
      window.history.back();
    }
  };

  const backUrl = mode === 'create' && !requestId ? '/request/create' : requestId ? `/request/${requestId}` : '/home';

  return (
    <div>
      <div className="fr-container fr-mt-4w">
        <div className="fr-mb-3w">
          <Link className="fr-link" to={backUrl}>
            <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true" />
            Détails de la requête
          </Link>
        </div>

        <h1 className="fr-mb-2w">Mis en cause et détails des faits</h1>
        <p className="fr-text--sm fr-mb-5w">Tous les champs sont facultatifs</p>

        <MisEnCause formData={formData} isSaving={isSaving} setFormData={setFormData} />

        <LieuSurvenu formData={formData} isSaving={isSaving} setFormData={setFormData} />

        <DescriptionFaits formData={formData} setFormData={setFormData} receptionType={receptionType} />

        <DemarchesEngagees formData={formData} setFormData={setFormData} />

        <AttachedFiles
          formData={formData}
          situationId={situationId}
          requestId={requestId}
          faitFiles={faitFiles}
          setFaitFiles={setFaitFiles}
          setFormData={setFormData}
          isSaving={isSaving}
        />

        <TraitementDesFaitsSection
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
          <Button ref={saveButtonRef} onClick={handleSave} disabled={isSaving}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
