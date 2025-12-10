import { Input } from '@codegouvfr/react-dsfr/Input';
import {
  CONSEQUENCE,
  consequenceLabels,
  type MaltraitanceQualifiedType,
  MOTIFS_HIERARCHICAL_DATA,
  type Motif,
  maltraitanceQualifiedLabels,
  motifLabels,
  RECEPTION_TYPE,
  type ReceptionType,
} from '@sirena/common/constants';
import type { SituationData } from '@sirena/common/schemas';
import { SelectWithChildren } from '@sirena/ui';

type DescriptionFaitsProps = {
  formData: SituationData;
  setFormData: React.Dispatch<React.SetStateAction<SituationData>>;
  receptionType?: ReceptionType;
};

export function DescriptionFaits({ formData, setFormData, receptionType }: DescriptionFaitsProps) {
  const motifs = [
    ...(formData.fait?.maltraitanceTypes || []).map((maltraitance) => {
      if (maltraitance in maltraitanceQualifiedLabels) {
        return maltraitanceQualifiedLabels[maltraitance as MaltraitanceQualifiedType];
      }
      return maltraitance;
    }),
    ...(formData.fait?.motifsDeclaratifs || []).map((motif) => {
      if (motif in motifLabels) {
        return motifLabels[motif as Motif];
      }
      return motif;
    }),
  ];

  const handleFaitInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData((prev) => ({
        ...prev,
        fait: {
          ...prev.fait,
          [field]: e.target.value,
        },
      }));
    };

  return (
    <div
      className="fr-p-4w fr-mb-4w"
      style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem' }}
    >
      <h2 className="fr-h6 fr-mb-3w">Description des faits</h2>
      <div className="fr-grid-row fr-grid-row--gutters">
        {receptionType === RECEPTION_TYPE.FORMULAIRE && (
          <div className="fr-col-12">
            <label className="fr-label" htmlFor="situation-fait-motifs">
              Motifs Renseigné par le déclarant
            </label>
            <div style={{ border: '1px solid var(--border-default-grey)', borderRadius: '0.25rem', padding: '0.5rem' }}>
              {motifs.length ? (
                motifs.map((motif) => (
                  <p key={motif} className="fr-text--md fr-mt-1v fr-mb-0">
                    {motif}
                  </p>
                ))
              ) : (
                <p className="fr-text--md fr-mt-1v fr-mb-0">Aucun motif renseigné</p>
              )}
            </div>
          </div>
        )}
        <div className="fr-col-12">
          <SelectWithChildren
            options={MOTIFS_HIERARCHICAL_DATA}
            value={formData.fait?.motifs || []}
            onChange={(values) =>
              setFormData((prev) => ({
                ...prev,
                fait: {
                  ...prev.fait,
                  motifs: values,
                },
              }))
            }
          />
        </div>

        <div className="fr-col-12">
          <SelectWithChildren
            label="Conséquences sur la personne"
            options={Object.entries(CONSEQUENCE).map(([key]) => ({
              label: consequenceLabels[key as keyof typeof CONSEQUENCE],
              value: key,
            }))}
            value={formData.fait?.consequences || []}
            onChange={(values) =>
              setFormData((prev) => ({
                ...prev,
                fait: {
                  ...prev.fait,
                  consequences: values,
                },
              }))
            }
          />
        </div>

        <div className="fr-col-12 fr-col-md-6">
          <Input
            label="Date de début des faits"
            nativeInputProps={{
              type: 'date',
              value: formData.fait?.dateDebut || '',
              onChange: handleFaitInputChange('dateDebut'),
            }}
          />
        </div>

        <div className="fr-col-12 fr-col-md-6">
          <Input
            label="Date de fin des faits"
            nativeInputProps={{
              type: 'date',
              value: formData.fait?.dateFin || '',
              onChange: handleFaitInputChange('dateFin'),
            }}
          />
        </div>

        <div className="fr-col-12">
          <Input
            label="Explication des faits par le déclarant"
            textArea
            nativeTextAreaProps={{
              value: formData.fait?.commentaire || '',
              onChange: handleFaitInputChange('commentaire'),
              rows: 4,
            }}
          />
        </div>

        <div className="fr-col-12">
          <Input
            label="Autres précisions"
            textArea
            nativeTextAreaProps={{
              value: formData.fait?.autresPrecisions || '',
              onChange: handleFaitInputChange('autresPrecisions'),
              rows: 4,
            }}
          />
        </div>
      </div>
    </div>
  );
}
