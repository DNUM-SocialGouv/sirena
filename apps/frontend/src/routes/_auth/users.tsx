import { LoggedLayout } from '@/components/layout/logged/logged';
import { Loader } from '@/components/loader.tsx';
import { useUser } from '@/hooks/queries/useUser';
import { requireAuthAndAdmin } from '@/lib/auth-guards';
import { type Column, DataTable } from '@sirena/ui';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_auth/users')({
  beforeLoad: requireAuthAndAdmin,
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useUser();
  if (!data) {
    return <Loader />;
  }

  type User = (typeof data.data)[number];

  const columns: Column<User>[] = [
    { key: 'lastName', label: 'Nom' },
    { key: 'firstName', label: 'Prénom' },
    { key: 'createdAt', label: 'Date de création' },
    { key: 'custom:editionLabel', label: 'Action' },
  ];

  const cells = {
    createdAt: (row: User) =>
      new Date(row.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    'custom:editionLabel': (row: User) => (
      <Link to="/user/$userId" params={{ userId: row.id }}>
        Traiter la demande
      </Link>
    ),
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
