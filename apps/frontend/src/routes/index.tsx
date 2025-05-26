import { useUser } from '@/hooks/queries/useUser';
import { Button } from '@sirena/ui';
import { type Column, DataTable, type OnSortChangeParams } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  // const { data } = useUser();

  type User = { id: string; nom: string; prenom: string };

  const [users, setUsers] = useState<User[]>([
    { id: '1', nom: 'Valère', prenom: 'Pique' },
    { id: '2', nom: 'Simon', prenom: 'Belbeoch' },
    { id: '3', nom: 'Alain', prenom: 'Dellon' },
  ]);

  const [sort, setSort] = useState<OnSortChangeParams<User>>({
    sort: 'id',
    sortDirection: 'asc',
  });

  const columns: Column<User>[] = [
    { key: 'id', label: 'Id', isSortable: true },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
  ];

  const handleSort = (sort: OnSortChangeParams<User>) => {
    setSort(sort);
    const newUsers = [...users];
    if (sort.sort === 'id' && sort.sortDirection === 'asc') {
      newUsers.sort((a, b) => a.id.localeCompare(b.id));
    } else if (sort.sort === 'id' && sort.sortDirection === 'desc') {
      newUsers.sort((a, b) => b.id.localeCompare(a.id));
    }
    setUsers(newUsers);
  };

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <Button label="Welcome from @sirena/ui" />
      <DataTable title="titre" rowId="id" data={users} columns={columns} onSortChange={handleSort} sort={sort} />
      {/* {JSON.stringify(data)} */}
    </div>
  );
}
