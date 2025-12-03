import { type TabDescriptor, Tabs } from '@sirena/ui';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Details } from '@/components/requestId/details';
import { Processing } from '@/components/requestId/processing';
import { RequestInfos } from '@/components/requestId/requestInfos';
import { formatFullName } from '@/components/requestId/sections/helpers';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import styles from '@/routes/_auth/_user/request.$requestId.module.css';
import { AffectationTab } from './tabs/AffectationTab';

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
  requestId?: string;
  initialData?: RequestData;
}

export function RequestForm({ requestId }: RequestFormProps) {
  const [activeTab, setActiveTab] = useState(0);
  const requestQuery = useRequeteDetails(requestId);
  const declarantIdentite = requestQuery.data?.requete.participant?.identite;
  const fullName = formatFullName(
    declarantIdentite
      ? {
          civilite: declarantIdentite.civiliteId ? { label: declarantIdentite.civiliteId } : undefined,
          prenom: declarantIdentite.prenom,
          nom: declarantIdentite.nom?.toUpperCase() || '',
        }
      : null,
  );

  const motif = requestQuery.data?.requete.situations?.[0]?.faits?.[0]?.motifs?.[0]?.motif.label || null;
  const statutId = requestQuery.data?.statutId || '';

  const tabs: TabDescriptor[] = [
    { label: 'Détails de la requête', tabPanelId: 'panel-details', tabId: 'tab-details' },
    {
      label: 'Affectation',
      tabPanelId: 'panel-affectation',
      tabId: 'tab-affectation',
      disabled: !requestId,
      title: !requestId ? 'Disponible après la création de la requête' : undefined,
    },
    {
      label: 'Traitement',
      tabPanelId: 'panel-traitement',
      tabId: 'tab-traitement',
      disabled: !requestId,
      title: !requestId ? 'Disponible après la création de la requête' : undefined,
    },
  ];

  const handleTabChange = (newTabIndex: number) => {
    setActiveTab(newTabIndex);
  };

  return (
    <>
      <div className="bg-cumulus fr-mb-4w">
        <div className="fr-container fr-py-2w">
          <div className="fr-mb-2w">
            <Link className="fr-link fr-mb-1w" to="/home">
              <span className="fr-icon-arrow-left-line fr-icon--sm" aria-hidden="true"></span> Liste des requêtes
            </Link>
          </div>
          <RequestInfos requestId={requestId} fullName={fullName} motif={motif} statutId={statutId} />{' '}
        </div>
      </div>
      <div className="fr-container">
        <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange} className={styles['request-tabs']}>
          {activeTab === 0 && <Details requestId={requestId} requestQuery={requestQuery} />}
          {activeTab === 1 && <AffectationTab />}
          {activeTab === 2 && <Processing requestId={requestId} requestQuery={requestQuery} />}
        </Tabs>
      </div>
    </>
  );
}
