import { LoggedLayout } from '@/components/layout/logged/logged';
import { useUser } from '@/hooks/queries/useUser';
import { type Column, DataTable } from '@sirena/ui';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/users')({
  beforeLoad: ({ location, context }) => {
    if (!context.userStore.isLogged) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
    if (!context.userStore.isAdmin) {
      throw redirect({
        to: '/home',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useUser();
  if (!data) {
    return <div>Loading...</div>;
  }

  type User = (typeof data.data)[number];

  const columns: Column<User>[] = [
    { key: 'id', label: 'Id' },
    { key: 'email', label: 'Email' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'createdAt', label: 'Date de création' },
    { key: 'role', label: 'Rôle' },
  ];

  const cells = {
    createdAt: (row: User) =>
      new Date(row.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
  };

  return (
    <LoggedLayout>
      <div className="home">
        <h2>Welcome to users</h2>
        <DataTable title="Liste des utilisateurs" rowId="id" data={data.data} columns={columns} cells={cells} />
      </div>
    </LoggedLayout>
  );
}
