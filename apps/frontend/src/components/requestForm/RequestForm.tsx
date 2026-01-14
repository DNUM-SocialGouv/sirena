import { type TabDescriptor, Tabs } from '@sirena/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { Details } from '@/components/requestId/details';
import { Processing } from '@/components/requestId/processing';
import { RequestInfos } from '@/components/requestId/requestInfos';
import { formatFullName } from '@/components/requestId/sections/helpers';
import { useRequeteDetails } from '@/hooks/queries/useRequeteDetails';
import { useRequeteStatusSSE } from '@/hooks/useRequeteStatusSSE';
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

interface RequestFormProps {
  requestId?: string;
  initialData?: RequestData;
}

export function RequestForm({ requestId }: RequestFormProps) {
  const [activeTab, setActiveTab] = useState(0);
  const queryClient = useQueryClient();
  const requestQuery = useRequeteDetails(requestId);

  const handleUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['requete', requestId] });
  }, [queryClient, requestId]);

  useRequeteStatusSSE({
    requeteId: requestId || '',
    enabled: !!requestId,
    onUpdate: handleUpdate,
  });
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

  const motifs = [
    ...new Set(
      requestQuery.data?.requete.situations.flatMap((s) =>
        s.faits.flatMap((f) => f.motifs.flatMap((m) => (m.motif.label ? [m.motif.label] : []))),
      ) || [],
    ),
  ];
  const statutId = requestQuery.data?.statutId || '';
  const prioriteId = requestQuery.data?.prioriteId || null;

  const tabs: TabDescriptor[] = [
    { label: 'Détails de la requête', tabPanelId: 'panel-details', tabId: 'tab-details' },
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
          <RequestInfos
            requestId={requestId}
            fullName={fullName}
            motifs={motifs}
            statutId={statutId}
            prioriteId={prioriteId}
          />{' '}
        </div>
      </div>
      <div className="fr-container">
        <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange} className={styles['request-tabs']}>
          {activeTab === 0 && <Details requestId={requestId} requestQuery={requestQuery} />}
          {activeTab === 1 && <Processing requestId={requestId} requestQuery={requestQuery} />}
        </Tabs>
      </div>
    </>
  );
}
