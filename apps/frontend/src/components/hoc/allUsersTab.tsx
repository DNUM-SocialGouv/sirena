import { Loader } from '@/components/loader.tsx';
import { useUsers } from '@/hooks/queries/useUser';
import { ROLES, roles } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link } from '@tanstack/react-router';

export function AllUsersTab() {
  const nonPendingRoleIds = Object.keys(roles)
    .filter((roleId) => roleId !== ROLES.PENDING)
    .join(',');

  const { data, isLoading: usersLoading, error: usersError } = useUsers({ roleId: nonPendingRoleIds });

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

  if (!data) {
    return (
      <div className="empty-state">
        <p>Aucune donnée disponible</p>
      </div>
    );
  }
  type User = (typeof data)[number];

  const columns: Column<User>[] = [
    { key: 'lastName', label: 'Nom' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'role.label', label: 'Rôle' },
    { key: 'active', label: 'Statut' },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells: Cells<User> = {
    active: (row: User) => (row.active ? 'Actif' : 'Inactif'),
    'custom:editionLabel': (row: User) => (
      <Link to="/admin/user/$userId" className="fr-link" params={{ userId: row.id }}>
        Gérer l'utilisateur
      </Link>
    ),
  };

  return <DataTable title="Liste des utilisateurs" rowId="id" data={data} columns={columns} cells={cells} />;
}
