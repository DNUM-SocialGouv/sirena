import { PendingUsersTab } from '@/components/hoc/PendingUsersTab';
import { LoggedLayout } from '@/components/layout/logged/logged';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { type TabDescriptor, Tabs } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/users')({
  beforeLoad: requireAuthAndAdmin,
  component: RouteComponent,
});

export function RouteComponent() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs: TabDescriptor[] = [
    { label: 'Utilisateurs en attente', tabPanelId: 'panel-pending', tabId: 'tab-pending' },
    { label: 'Tous les utilisateurs', tabPanelId: 'panel-all', tabId: 'tab-all' },
  ];

  const tabContent = [
    <PendingUsersTab key="pending-users" />,
    <div key="all-users">
      <h3>Tous les utilisateurs</h3>
      <p>Fonctionnalité à venir : affichage de tous les utilisateurs</p>
    </div>,
  ];

  return (
    <LoggedLayout>
      <div className="home">
        <h2>Gestion des utilisateurs</h2>
        <Tabs tabs={tabs} activeTab={activeTab} onUpdateActiveTab={setActiveTab}>
          {tabContent[activeTab]}
        </Tabs>
      </div>
    </LoggedLayout>
  );
}
