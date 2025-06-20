import { Loader } from '@/components/loader.tsx';
import { useRoles } from '@/hooks/queries/useRoles.ts';
import { useUser } from '@/hooks/queries/useUser';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link } from '@tanstack/react-router';

export function AllUsersTab() {
  const { data: rolesData, isLoading: rolesLoading, error: rolesError } = useRoles();

  const nonPendingRoleIds = rolesData?.data
    .filter((role) => role.roleName !== 'PENDING')
    .map((role) => role.id)
    .join(',');

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useUser(nonPendingRoleIds ? { roleId: nonPendingRoleIds } : undefined);

  if (rolesLoading || usersLoading) {
    return <Loader />;
  }

  if (rolesError || usersError) {
    return (
      <div className="error-state">
        <p>Erreur lors du chargement des utilisateurs</p>
      </div>
    );
  }

  if (!usersData) {
    return (
      <div className="empty-state">
        <p>Aucune donnée disponible</p>
      </div>
    );
  }
  type User = (typeof usersData.data)[number];

  const columns: Column<User>[] = [
    { key: 'lastName', label: 'Nom' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'role.description', label: 'Rôle' },
    { key: 'custom:status', label: 'Statut' },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells: Cells<User> = {
    'custom:status': (row: User) => (row.active ? 'Actif' : 'Inactif'),
    'custom:editionLabel': (row: User) => (
      <Link to="/user/$userId" className="fr-link" params={{ userId: row.id }}>
        Gérer l'utilisateur
      </Link>
    ),
  };

  return <DataTable title="Liste des utilisateurs" rowId="id" data={usersData.data} columns={columns} cells={cells} />;
}
