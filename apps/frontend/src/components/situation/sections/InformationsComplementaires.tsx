import { Select } from '@codegouvfr/react-dsfr/Select';
import { DOMAINES_FONCTIONNELS, domainesFonctionnelsLabels } from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { useMemo } from 'react';
import { AttachedFiles } from './AttachedFiles';
import { DemarchesEngagees } from './DemarchesEngagees';
import styles from './InformationsComplementaires.module.css';

type InformationsComplementairesProps = {
  formData: SituationData;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  situationId?: string;
  requestId?: string;
  faitFiles: File[];
  setFaitFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isSaving: boolean;
};

export function InformationsComplementaires({
  formData,
  setFormData,
  situationId,
  requestId,
  faitFiles,
  setFaitFiles,
  isSaving,
}: InformationsComplementairesProps) {
  const domaineOptions = useMemo(
    () =>
      Object.values(DOMAINES_FONCTIONNELS).map((value) => ({
        value,
        label: domainesFonctionnelsLabels[value],
      })),
    [],
  );

  const handleDomaineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || undefined;
    setFormData((prev) => ({ ...prev, domainesFonctionnels: value }));
  };

  return (
    <section className={`fr-p-4w fr-mb-4w ${styles.container}`}>
      <h2 className="fr-h6">Informations complémentaires</h2>

      <Select
        label="Domaine fonctionnel"
        nativeSelectProps={{
          value: formData.domainesFonctionnels ?? '',
          onChange: handleDomaineChange,
        }}
      >
        <option value="">Sélectionner une option</option>
        {domaineOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

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
    </section>
  );
}
