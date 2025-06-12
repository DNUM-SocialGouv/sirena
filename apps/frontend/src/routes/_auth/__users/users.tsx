import { LoggedLayout } from '@/components/layout/logged/logged';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { type TabDescriptor, Tabs } from '@sirena/ui';
import { Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/__users/users')({
  beforeLoad: requireAuthAndAdmin,
  component: RouteComponent,
});

export function RouteComponent() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.includes('/users/all') ? 1 : 0;

  const tabs: TabDescriptor[] = [
    { label: 'Utilisateurs en attente', tabPanelId: 'panel-pending', tabId: 'tab-pending' },
    { label: 'Tous les utilisateurs', tabPanelId: 'panel-all', tabId: 'tab-all' },
  ];

  const handleTabChange = (newTabIndex: number) => {
    const newPath = newTabIndex === 0 ? '/users/pending' : '/users/all';
    navigate({ to: newPath });
  };

  return (
    <LoggedLayout>
      <div className="home">
        <h2>Gestion des utilisateurs</h2>
        <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange}>
          <Outlet />
        </Tabs>
      </div>
    </LoggedLayout>
  );
}
