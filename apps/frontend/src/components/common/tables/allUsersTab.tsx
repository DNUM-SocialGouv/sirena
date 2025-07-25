import { ROLES, roles, type StatutType, statutTypes } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link } from '@tanstack/react-router';
import { useUsers } from '@/hooks/queries/users.hook';

type User = NonNullable<Awaited<ReturnType<typeof useUsers>>['data']>['data'][number];

export function AllUsersTab() {
  const nonPendingRoleIds = Object.keys(roles)
    .filter((roleId) => roleId !== ROLES.PENDING)
    .join(',');

  const { data: users, isFetching } = useUsers({ roleId: nonPendingRoleIds });

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

  return (
    <DataTable
      title="Liste des utilisateurs"
      rowId="id"
      data={users?.data ?? []}
      columns={columns}
      cells={cells}
      isLoading={isFetching}
    />
  );
}
