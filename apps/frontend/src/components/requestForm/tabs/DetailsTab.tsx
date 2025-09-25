import { Button } from '@codegouvfr/react-dsfr/Button';
import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { useState } from 'react';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

// TODO: Use API types instead of local interfaces
interface RequestData {
  declarant?: Record<string, unknown>;
  personneConcernee?: Record<string, unknown>;
  lieuxFaits?: Record<string, unknown>;
  requeteOriginale?: {
    files?: Array<{ id: string; name: string; size: number }>;
  };
}

interface DetailsTabProps {
  initialData?: RequestData;
}

export function DetailsTab({ initialData }: DetailsTabProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const fileArray = Array.from(selectedFiles);
      setFiles(fileArray);
      setUploadError(null);
    }
  };

  return (
    <div>
      <div className={styles['request-details-content']}>
        <section>
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
            <div className="fr-col">
              <h2 className="fr-h5 fr-mb-0">Déclarant</h2>
            </div>
            <div className="fr-col-auto">
              <Button priority="tertiary no outline" size="small" iconId="fr-icon-pencil-line">
                Éditer
              </Button>
            </div>
          </div>
          <p className="fr-text--sm">{initialData?.declarant ? 'Données du déclarant...' : 'Aucune information'}</p>
        </section>
      </div>

      <div className={`${styles['request-details-content']} fr-mt-3w`}>
        <section>
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
            <div className="fr-col">
              <h2 className="fr-h5 fr-mb-0">Personne concernée</h2>
            </div>
            <div className="fr-col-auto">
              <Button priority="tertiary no outline" size="small" iconId="fr-icon-pencil-line">
                Éditer
              </Button>
            </div>
          </div>
          <p className="fr-text--sm">
            {initialData?.personneConcernee ? 'Données de la personne concernée...' : 'Aucune information'}
          </p>
        </section>
      </div>

      <div className={`${styles['request-details-content']} fr-mt-3w`}>
        <section>
          <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
            <div className="fr-col">
              <h2 className="fr-h5 fr-mb-0">Lieu, mis en cause et faits</h2>
            </div>
            <div className="fr-col-auto">
              <Button priority="tertiary no outline" size="small" iconId="fr-icon-pencil-line">
                Éditer
              </Button>
            </div>
          </div>
          <p className="fr-text--sm">
            {initialData?.lieuxFaits ? 'Données des lieux et faits...' : 'Aucune information'}
          </p>
        </section>
      </div>

      <div className={`${styles['request-details-content']} fr-mt-3w`}>
        <section>
          <h2 className="fr-h5 fr-mb-3w">Requête originale</h2>
          <Upload
            label="Ajouter un ou plusieurs fichiers"
            hint="Taille maximale: 10 Mo. Formats supportés: .pdf, .png, .jpeg, .eml, .xlsx, .docx, .odt, .msg"
            multiple
            state={uploadError ? 'error' : undefined}
            stateRelatedMessage={uploadError ?? undefined}
            nativeInputProps={{
              accept: '.pdf,.png,.jpeg,.eml,.xlsx,.docx,.odt,.msg',
              onChange: handleFileChange,
            }}
          />
          {files.length > 0 && (
            <div className="fr-mt-2w">
              <p className="fr-text--sm fr-text--bold">Fichiers sélectionnés :</p>
              <ul className="fr-text--sm">
                {files.map((file) => (
                  <li key={file.name}>
                    {file.name} ({(file.size / 1024).toFixed(2)} Ko)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
