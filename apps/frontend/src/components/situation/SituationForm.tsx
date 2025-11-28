import { Button } from '@codegouvfr/react-dsfr/Button';
import type { ReceptionType } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
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
  onSave: (data: SituationData, shouldCreateRequest: boolean, faitFiles: File[]) => Promise<void>;
}

export function SituationForm({
  mode,
  requestId,
  situationId,
  initialData,
  receptionType,
  onSave,
}: SituationFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SituationData>(initialData || {});
  const [isSaving, setIsSaving] = useState(false);
  const [faitFiles, setFaitFiles] = useState<File[]>([]);
  const [isTraitementDesFaitsValid, setIsTraitementDesFaitsValid] = useState(true);
  const { data: entitesData } = useEntites(undefined);
  const { data: profile } = useProfile();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

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
    setIsSaving(true);
    try {
      if (!hasSituationContent(formData, faitFiles)) {
        handleCancel();
        return;
      }

      const shouldCreateRequest = mode === 'create' && !requestId;
      await onSave(formData, shouldCreateRequest, faitFiles);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'create' && !requestId) {
      navigate({ to: '/home' });
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
          isSaving={isSaving}
        />

        <TraitementDesFaitsSection
          entites={(entitesData?.data || []).map((e: { id: string; nomComplet: string }) => ({
            id: e.id,
            nomComplet: e.nomComplet,
          }))}
          userEntiteId={profile?.entiteId}
          initialEntites={formData.traitementDesFaits?.entites}
          onChange={handleTraitementDesFaitsChange}
          onValidationChange={setIsTraitementDesFaitsValid}
          disabled={isSaving}
        />

        {/* Actions */}
        <div className="fr-btns-group fr-btns-group--inline-md fr-mb-6w">
          <Button priority="secondary" onClick={handleCancel} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isTraitementDesFaitsValid}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
