import { ROLES } from '@sirena/common/constants';
import { type TabDescriptor, Tabs } from '@sirena/ui';
import { createFileRoute, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { AllUsersTab } from '@/components/common/tables/allUsersTab';
import { PendingUsersTab } from '@/components/common/tables/pendingUsersTab';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { QueryParamsSchema } from '@/schemas/pagination.schema';

export const Route = createFileRoute('/_auth/admin/users')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  validateSearch: QueryParamsSchema,
  component: RouteComponent,
});

export function RouteComponent() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const isAllRoute = matchRoute({ to: '/admin/users/all', fuzzy: false });

  const activeTab = isAllRoute ? 1 : 0;

  const tabs: TabDescriptor[] = [
    { label: "Gestion des demandes d'habilitations", tabPanelId: 'panel-pending', tabId: 'tab-pending' },
    { label: 'Gestion des utilisateurs', tabPanelId: 'panel-all', tabId: 'tab-all' },
  ];

  const tabPaths = ['/admin/users', '/admin/users/all'];

  const handleTabChange = (newTabIndex: number) => {
    navigate({ to: tabPaths[newTabIndex] });
  };

  return (
    <div className="home">
      <h1>Gestion des utilisateurs et des habilitations</h1>
      <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange}>
        {activeTab === 0 ? <PendingUsersTab /> : <AllUsersTab />}
      </Tabs>
    </div>
  );
}
