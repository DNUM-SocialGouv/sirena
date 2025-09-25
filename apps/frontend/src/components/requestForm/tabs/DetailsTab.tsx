import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { InfoSection } from '@sirena/ui';
import { useState } from 'react';

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
      <InfoSection
        title="Déclarant"
        onEdit={() => console.log('Edit declarant')}
        renderSummary={() => (
          <div className="fr-text--sm">{initialData?.declarant ? 'Données du déclarant...' : 'Aucune information'}</div>
        )}
        renderDetails={() => (
          <div className="fr-text--sm">Détails complets du déclarant avec toutes les informations...</div>
        )}
        emptyLabel="Aucune information sur le déclarant"
      />

      <InfoSection
        title="Personne concernée"
        onEdit={() => console.log('Edit personne concernée')}
        renderSummary={() => (
          <div className="fr-text--sm">
            {initialData?.personneConcernee ? 'Données de la personne concernée...' : 'Aucune information'}
          </div>
        )}
        renderDetails={() => (
          <div className="fr-text--sm">Détails complets de la personne concernée avec toutes les informations...</div>
        )}
        emptyLabel="Aucune information sur la personne concernée"
      />

      <InfoSection
        title="Lieu, mis en cause et faits"
        onEdit={() => console.log('Edit lieux et faits')}
        renderSummary={() => (
          <div className="fr-text--sm">
            {initialData?.lieuxFaits ? 'Données des lieux et faits...' : 'Aucune information'}
          </div>
        )}
        renderDetails={() => (
          <div className="fr-text--sm">Détails complets des lieux, personnes mises en cause et faits...</div>
        )}
        emptyLabel="Aucune information sur les lieux et faits"
      />

      <InfoSection
        title="Requête originale"
        renderSummary={() => (
          <div>
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
            {initialData?.requeteOriginale?.files && initialData.requeteOriginale.files.length > 0 && (
              <div className="fr-mt-2w">
                <p className="fr-text--sm fr-text--bold">Fichiers existants :</p>
                <ul className="fr-text--sm">
                  {initialData.requeteOriginale.files.map((file) => (
                    <li key={file.id}>
                      {file.name} ({(file.size / 1024).toFixed(2)} Ko)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        emptyLabel="Aucun fichier de requête originale"
      />
    </div>
  );
}
