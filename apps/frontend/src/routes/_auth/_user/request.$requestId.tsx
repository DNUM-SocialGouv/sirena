import { ROLES } from '@sirena/common/constants';
import { type TabDescriptor, Tabs } from '@sirena/ui';
import { createFileRoute, Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { z } from 'zod';
import { Details } from '@/components/requestId/details';
import { Processing } from '@/components/requestId/processing';
import { RequestInfos } from '@/components/requestId/requestInfos';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import styles from './request.$requestId.module.css';

export const Route = createFileRoute('/_auth/_user/request/$requestId')({
  beforeLoad: requireAuthAndRoles([ROLES.ENTITY_ADMIN, ROLES.NATIONAL_STEERING, ROLES.READER, ROLES.WRITER]),
  params: {
    parse: (params) => ({
      requestId: z.string().parse(params.requestId),
    }),
  },
  head: () => ({
    meta: [
      {
        title: 'Détails de la requête - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  const isAllRoute = matchRoute({ to: '/request/$requestId/processing', fuzzy: false });

  const activeTab = isAllRoute ? 1 : 0;

  useEffect(() => {
    const title = activeTab === 1 ? 'Traitement requête - SIRENA' : 'Détails de la requête - SIRENA';
    document.title = title;
  }, [activeTab]);

  const tabs: TabDescriptor[] = [
    { label: 'Détails de la requête', tabPanelId: 'panel-details', tabId: 'tab-details' },
    { label: 'Traitement', tabPanelId: 'panel-traitement', tabId: 'tab-traitement' },
  ];

  const tabPaths = ['/request/$requestId', '/request/$requestId/processing'];

  const handleTabChange = (newTabIndex: number) => {
    navigate({ to: tabPaths[newTabIndex] });
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
          <RequestInfos />
        </div>
      </div>
      <div className="fr-container">
        <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange} className={styles['request-tabs']}>
          {activeTab === 0 ? <Details /> : <Processing />}
        </Tabs>
      </div>
    </div>
  );
}
