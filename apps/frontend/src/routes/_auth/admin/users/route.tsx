import { requireAuthAndRoles } from '@/lib/auth-guards';
import { ROLES } from '@sirena/common/constants';
import { type TabDescriptor, Tabs } from '@sirena/ui';
import { Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/admin/users')({
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN]),
  component: RouteComponent,
});

export function RouteComponent() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(location.pathname.includes('/admin/users/all') ? 1 : 0);

  const tabs: TabDescriptor[] = [
    { label: "Gestion des demandes d'habilitations", tabPanelId: 'panel-pending', tabId: 'tab-pending' },
    { label: 'Gestion des utilisateurs', tabPanelId: 'panel-all', tabId: 'tab-all' },
  ];

  const handleTabChange = (newTabIndex: number) => {
    const newPath = newTabIndex === 0 ? '/admin/users' : '/admin/users/all';
    setActiveTab(newTabIndex);
    navigate({ to: newPath });
  };

  return (
    <div className="home">
      <h2>Gestion des utilisateurs et des habilitations</h2>
      <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={handleTabChange}>
        <Outlet />
      </Tabs>
    </div>
  );
}
