import { type RequeteStatutType, requeteStatutType } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';

type DematSocialMapping = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number];

export function RequetesEntite() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const { data: requetes, isFetching } = useRequetesEntite(queries);
  const [title, setTitle] = useState('Requêtes');

  useEffect(() => {
    if (requetes) {
      setTitle(`Requêtes: ${requetes.meta.total}`);
    }
  }, [requetes]);

  const columns: Column<DematSocialMapping>[] = [
    { key: 'number', label: 'Numero' },
    { key: 'createdAt', label: 'Réception' },
    { key: 'custom:lieu', label: 'Lieu de survenue' },
    { key: 'custom:misEnCause', label: 'Mis en cause' },
    { key: 'custom:Attribution', label: 'Attribution' },
    { key: 'custom:statut', label: 'Statut' },
    { key: 'custom:action', label: 'Action' },
  ];

  const cells: Cells<DematSocialMapping> = {
    'custom:action': (row) => (
      <Link to="/request/$requestId" params={{ requestId: row.id }}>
        Voir la requête
      </Link>
    ),
    createdAt: (row) => (
      <div>
        {new Date(row.createdAt).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}
      </div>
    ),
    'custom:statut': (row) =>
      row.requetesEntiteStates[0]?.statutId
        ? requeteStatutType[row.requetesEntiteStates[0]?.statutId as RequeteStatutType]
        : '',
  };

  return (
    <DataTable
      title={title}
      rowId="id"
      data={requetes?.data ?? []}
      columns={columns}
      cells={cells}
      isLoading={isFetching}
    />
  );
}
