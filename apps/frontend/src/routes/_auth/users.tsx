import { LoggedLayout } from '@/components/layout/logged/logged';
import { Loader } from '@/components/loader.tsx';
import { useRoles } from '@/hooks/queries/useRoles';
import { useUser } from '@/hooks/queries/useUser';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { type Cells, type Column, DataTable, type TabDescriptor, Tabs } from '@sirena/ui';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/users')({
  beforeLoad: requireAuthAndAdmin,
  component: RouteComponent,
});

function RouteComponent() {
  const [activeTab, setActiveTab] = useState(0);

  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useRoles();

  const pendingRole = rolesData?.data?.find((role) => role.roleName === 'PENDING');
  const pendingRoleId = pendingRole?.id;

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useUser(pendingRoleId ? { roleId: pendingRoleId } : undefined, !!pendingRoleId);

  if (rolesLoading || (pendingRoleId && usersLoading)) {
    return (
      <LoggedLayout>
        <Loader />
      </LoggedLayout>
    );
  }

  if (rolesError || usersError) {
    return (
      <LoggedLayout>
        <div>Erreur lors du chargement des données</div>
      </LoggedLayout>
    );
  }

  if (!rolesData || !usersData) {
    return (
      <LoggedLayout>
        <Loader />
      </LoggedLayout>
    );
  }

  type User = (typeof usersData.data)[number];

  const columns: Column<User>[] = [
    { key: 'lastName', label: 'Nom' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'createdAt', label: 'Date de création' },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells: Cells<User> = {
    createdAt: (row: User) => (
      <div>
        {new Date(row.createdAt).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}
      </div>
    ),
    'custom:editionLabel': (row: User) => (
      <Link to="/user/$userId" params={{ userId: row.id }}>
        Traiter la demande
      </Link>
    ),
  };

  const tabs: TabDescriptor[] = [
    { label: 'Utilisateurs en attente', tabPanelId: 'panel-pending', tabId: 'tab-pending' },
    { label: 'Tous les utilisateurs', tabPanelId: 'panel-all', tabId: 'tab-all' },
  ];

  const tabContent = [
    <DataTable
      key="pending-users"
      title="Liste des utilisateurs en attente de validation"
      rowId="id"
      data={usersData.data}
      columns={columns}
      cells={cells}
    />,

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
