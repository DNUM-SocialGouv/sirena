import { Breadcrumb } from '@codegouvfr/react-dsfr/Breadcrumb';
import { ROLES } from '@sirena/common/constants';
import { type TabDescriptor, Tabs } from '@sirena/ui';
import { createFileRoute, useMatchRoute, useNavigate } from '@tanstack/react-router';
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
  head: ({ params }) => ({
    meta: [
      {
        title: `Requête ${params.requestId || ''} - SIRENA`,
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();

  const isAllRoute = matchRoute({ to: '/request/$requestId/processing', fuzzy: false });

  const activeTab = isAllRoute ? 1 : 0;

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
      <div className="fr-container">
        <div className="fr-mb-2w">
          <Breadcrumb
            currentPageLabel={`Requête n°${requestId}`}
            segments={[
              {
                label: 'Liste des requêtes',
                linkProps: {
                  to: '/home',
                },
              },
            ]}
          />
        </div>

        <RequestInfos />

        <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange} className={styles['request-tabs']}>
          {activeTab === 0 ? <Details /> : <Processing />}
        </Tabs>
      </div>
    </div>
  );
}
