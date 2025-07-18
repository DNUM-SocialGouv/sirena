import { ROLES, roles, type StatutType, statutTypes } from '@sirena/common/constants';
import { type Cells, type Column, DataTable, Loader } from '@sirena/ui';
import { Link } from '@tanstack/react-router';
import { useUsers } from '@/hooks/queries/users.hook';

export function AllUsersTab() {
  const nonPendingRoleIds = Object.keys(roles)
    .filter((roleId) => roleId !== ROLES.PENDING)
    .join(',');

  const { data: response, isLoading: usersLoading, error: usersError } = useUsers({ roleId: nonPendingRoleIds });

  if (usersLoading) {
    return <Loader />;
  }

  if (usersError) {
    return (
      <div className="error-state">
        <p>Erreur lors du chargement des utilisateurs</p>
      </div>
    );
  }

  type User = (typeof response.data)[number];

  const columns: Column<User>[] = [
    { key: 'lastName', label: 'Nom' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'role.label', label: 'Rôle' },
    { key: 'statutId', label: 'Statut' },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells: Cells<User> = {
    statutId: (row: User) => statutTypes[row.statutId as StatutType],
    'custom:editionLabel': (row: User) => (
      <Link to="/admin/user/$userId" className="fr-link" params={{ userId: row.id }}>
        Gérer l'utilisateur
      </Link>
    ),
  };

  return <DataTable title="Liste des utilisateurs" rowId="id" data={response.data} columns={columns} cells={cells} />;
}
