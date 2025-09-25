import { type TabDescriptor, Tabs } from '@sirena/ui';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { AffectationTab, DetailsTab, TraitementTab } from './tabs';

// TODO: Use API types instead of local interfaces
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
    {
      label: 'Affectation',
      tabPanelId: 'panel-affectation',
      tabId: 'tab-affectation',
      title: isCreateMode ? 'Cet onglet sera disponible une fois la requête créée' : undefined,
      disabled: isCreateMode,
    },
    {
      label: 'Traitement',
      tabPanelId: 'panel-traitement',
      tabId: 'tab-traitement',
      title: isCreateMode ? 'Cet onglet sera disponible une fois la requête créée' : undefined,
      disabled: isCreateMode,
    },
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
