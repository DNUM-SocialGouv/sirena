import { type RequeteStatutType, requeteStatutType } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Loader } from '@/components/loader.tsx';
import { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';

export function RequetesEntite() {
  const queries = useSearch({ from: '/_auth/_user/home' });

  const { data: response, isLoading, error } = useRequetesEntite(queries);

  if (error) {
    return (
      <div className="error-state">
        <p>Erreur lors du chargement des requêtes</p>
      </div>
    );
  }

  const [title, setTitle] = useState('Requêtes');

  useEffect(() => {
    if (response) {
      setTitle(`Requêtes: ${response.meta.total}`);
    }
  }, [response]);

  type DematSocialMapping = (typeof response.data)[number];

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
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <DataTable title={title} rowId="id" data={response.data} columns={columns} cells={cells} />
      )}
    </>
  );
}
