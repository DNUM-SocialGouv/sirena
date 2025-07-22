import { type RequeteStatutType, requeteStatutType } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';

type DematSocialMapping = Exclude<Awaited<ReturnType<typeof useRequetesEntite>>['data'], undefined>['data'][number];

export function RequetesEntite() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const requetesQuery = useRequetesEntite(queries);
  const [title, setTitle] = useState('Requêtes');

  useEffect(() => {
    if (requetesQuery.data) {
      setTitle(`Requêtes: ${requetesQuery.data.meta.total}`);
    }
  }, [requetesQuery.data]);
  const columns: Column<DematSocialMapping>[] = [
    { key: 'number', label: 'Numero' },
    { key: 'custom:reception', label: 'Réception' },
    { key: 'custom:lieu', label: 'Lieu de survenue' },
    { key: 'custom:misEnCause', label: 'Mis en cause' },
    { key: 'custom:Attribution', label: 'Attribution' },
    { key: 'custom:statut', label: 'Statut' },
    { key: 'custom:action', label: 'Action' },
  ];

  const cells: Cells<DematSocialMapping> = {
    'custom:action': (row) => (
      <Link to="/admin/demat-social-mapping/$dematSocialMappingId" params={{ dematSocialMappingId: row.id }}>
        Éditer mapping
      </Link>
    ),
    'custom:statut': (row) =>
      row.requetesEntiteStates[0]?.statutId
        ? requeteStatutType[row.requetesEntiteStates[0]?.statutId as RequeteStatutType]
        : '',
  };

  return (
    <QueryStateHandler query={requetesQuery}>
      {({ data: response }) => (
        <DataTable title={title} rowId="id" data={response.data} columns={columns} cells={cells} />
      )}
    </QueryStateHandler>
  );
}
