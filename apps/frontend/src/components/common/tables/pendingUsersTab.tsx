import { ROLES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link } from '@tanstack/react-router';
import { useUsers } from '@/hooks/queries/users.hook';

type User = NonNullable<Awaited<ReturnType<typeof useUsers>>['data']>['data'][number];

export function PendingUsersTab() {
  const pendingRoleId = ROLES.PENDING;

  const { data: users, isFetching } = useUsers({ roleId: pendingRoleId });

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
      data={users?.data ?? []}
      columns={columns}
      cells={cells}
      isLoading={isFetching}
    />
  );
}
