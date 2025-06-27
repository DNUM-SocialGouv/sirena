import { Loader } from '@/components/loader.tsx';
import { useUser } from '@/hooks/queries/useUser';
import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link } from '@tanstack/react-router';

export function PendingUsersTab() {
  const pendingRoleId = ROLES.PENDING;

  const { data: usersData, isLoading: usersLoading, error: usersError } = useUser({ roleId: pendingRoleId });

  if (usersLoading) {
    return <Loader />;
  }

  if (usersError) {
    return (
      <div className="error-state">
        <p>Erreur lors du chargement des utilisateurs en attente</p>
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
      <Link to="/admin/user/$userId" params={{ userId: row.id }}>
        Traiter la demande
      </Link>
    ),
  };

  return (
    <DataTable
      title="Demande d'habilitation en attente"
      rowId="id"
      data={usersData.data}
      columns={columns}
      cells={cells}
    />
  );
}
