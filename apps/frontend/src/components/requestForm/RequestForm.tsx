import { Button } from '@codegouvfr/react-dsfr/Button';

import { Upload } from '@codegouvfr/react-dsfr/Upload';
import { type TabDescriptor, Tabs } from '@sirena/ui';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';

interface RequestData {
  declarant?: Record<string, unknown>;
  personneConcernee?: Record<string, unknown>;
  lieuxFaits?: Record<string, unknown>;
  requeteOriginale?: {
    files?: Array<{ id: string; name: string; size: number }>;
  };
}

interface RequestFormProps {
  mode: 'create' | 'edit';
  requestId?: string;
  initialData?: RequestData;
}

export function RequestForm({ mode, requestId, initialData }: RequestFormProps) {
  const [activeTab, setActiveTab] = useState(0);

  const isCreateMode = mode === 'create';
  const title = isCreateMode ? 'Nouvelle requête' : `Requête n°${requestId}`;

  const tabs: TabDescriptor[] = [
    { label: 'Détails de la requête', tabPanelId: 'panel-details', tabId: 'tab-details' },
    { label: 'Affectation', tabPanelId: 'panel-affectation', tabId: 'tab-affectation' },
    { label: 'Traitement', tabPanelId: 'panel-traitement', tabId: 'tab-traitement' },
  ];

  const handleTabChange = (newTabIndex: number) => {
    // Only allow tab 0 (Détails) in create mode
    if (isCreateMode && newTabIndex !== 0) {
      return;
    }
    setActiveTab(newTabIndex);
  };

  return (
    <div>
      <div className="bg-cumulus fr-mb-4w">
        <div className="fr-container fr-py-2w">
          <div className="fr-mb-2w">
            <Link className="fr-link fr-mb-1w" to="/home">
              <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true"></span> Liste des requêtes
            </Link>
          </div>
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col">
              <h1 className="fr-mb-2w">{title}</h1>
              {isCreateMode && (
                <p className="fr-text--sm">La requête sera créée lorsqu'au moins une donnée sera renseignée</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="fr-container">
        <div className={isCreateMode ? styles.disabledTabs : ''}>
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onUpdateActiveTab={handleTabChange}
            className={styles['request-tabs']}
          >
            {activeTab === 0 && <DetailsTab initialData={initialData} />}
            {activeTab === 1 && !isCreateMode && <AffectationTab />}
            {activeTab === 2 && !isCreateMode && <TraitementTab />}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface DetailsTabProps {
  initialData?: RequestData;
}

function DetailsTab({ initialData }: DetailsTabProps) {
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

function AffectationTab() {
  return (
    <div className={styles['request-details-content']}>
      <p>Section Affectation - À implémenter</p>
    </div>
  );
}

function TraitementTab() {
  return (
    <div className={styles['request-details-content']}>
      <p>Section Traitement - À implémenter</p>
    </div>
  );
}
