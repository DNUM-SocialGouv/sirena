import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { type RequeteStatutType, requeteStatutType } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';

type DematSocialMapping = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number];

const DEFAULT_PAGE_SIZE = 10;

export function RequetesEntite() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });

  const limit = useMemo(() => parseInt(queries.limit || DEFAULT_PAGE_SIZE.toString(), 10), [queries.limit]);
  const offset = useMemo(() => parseInt(queries.offset || '0', 10), [queries.offset]);
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const { data: requetes, isFetching } = useRequetesEntite({
    ...queries,
    limit: limit.toString(),
    offset: offset.toString(),
  });
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

  const total = useMemo(() => requetes?.meta?.total ?? 0, [requetes?.meta?.total]);
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);
  const shouldShowPagination = useMemo(() => total > limit, [total, limit]);

  const getPageLinkProps = useCallback(
    (pageNumber: number) => {
      const newOffset = (pageNumber - 1) * limit;

      return {
        href: '#',
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          navigate({
            search: (prev) => ({
              ...prev,
              offset: newOffset === 0 ? undefined : newOffset.toString(),
              limit: limit === DEFAULT_PAGE_SIZE ? undefined : limit.toString(),
            }),
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      };
    },
    [navigate, limit],
  );

  return (
    <>
      <DataTable
        title={title}
        rowId="id"
        data={requetes?.data ?? []}
        columns={columns}
        cells={cells}
        isLoading={isFetching}
      />
      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </>
  );
}
