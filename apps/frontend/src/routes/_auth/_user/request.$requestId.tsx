import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Breadcrumb } from '@codegouvfr/react-dsfr/Breadcrumb';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Tabs } from '@codegouvfr/react-dsfr/Tabs';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { requireAuth } from '@/lib/auth-guards';
import styles from './request.$requestId.module.css';

export const Route = createFileRoute('/_auth/_user/request/$requestId')({
  beforeLoad: requireAuth,
  head: ({ params }) => ({
    meta: [
      {
        title: `Requête ${params?.requestId || ''} - SIRENA`,
      },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  const requestId = typeof params?.requestId === 'string' ? params.requestId : '';
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab based on current path
  const activeTabId = location.pathname.includes('/processing') ? 'processing' : 'details';

  return (
    <>
      <div className={styles['request-header']}>
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

          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <div className="fr-col">
              <h1 className="fr-mb-2w">
                Requête n°{requestId}
                <Badge severity="success" className="fr-ml-2w">
                  À QUALIFIER
                </Badge>
              </h1>
              <div className="fr-text--sm fr-text--grey">
                <span className="fr-icon-map-pin-2-line fr-mr-1v" aria-hidden="true"></span>
                [Nom de la personne]
                <span className="fr-mx-2v">•</span>
                <span className="fr-icon-building-line fr-mr-1v" aria-hidden="true"></span>
                [Nom de l'établissement]
                <span className="fr-mx-2v">•</span>
                <span className="fr-icon-alarm-warning-line fr-mr-1v" aria-hidden="true"></span>
                Priorité
              </div>
              <div className="fr-text--sm fr-text--grey fr-mt-1w">
                <span className="fr-icon-folder-2-line fr-mr-1v" aria-hidden="true"></span>
                Motifs : <Tag small>[Motif]</Tag>
              </div>
            </div>
            <div className="fr-col-auto">
              <div className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters">
                <div className="fr-col-auto">
                  <Tag>[Entité]</Tag>
                </div>
                <div className="fr-col-auto">
                  <div className="fr-btns-group fr-btns-group--inline-sm" style={{ marginBottom: 0 }}>
                    <Button priority="secondary" size="small">
                      Attribuer
                    </Button>
                    <Button priority="primary" size="small">
                      Clôturer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Tabs
            className={styles['tabs-custom']}
            selectedTabId={activeTabId}
            tabs={[
              {
                label: 'Détails de la requête',
                tabId: 'details',
              },
              {
                label: 'Traitement',
                tabId: 'processing',
              },
            ]}
            onTabChange={(tabId) => {
              navigate({
                to: tabId === 'processing' ? '/request/$requestId/processing' : '/request/$requestId',
                params: { requestId },
              });
            }}
          >
            {/** biome-ignore lint/complexity/noUselessFragments: Required for typescript validation */}
            <></>
          </Tabs>
        </div>
      </div>

      <div className="request-details">
        <Outlet />
      </div>
    </>
  );
}
