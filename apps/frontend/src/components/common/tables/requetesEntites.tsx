import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { type RequeteStatutType, requeteStatutType } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';

type RequeteEntiteRow = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number] & {
  id: string;
};

const DEFAULT_PAGE_SIZE = 10;

export function RequetesEntite() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });

  const limit = useMemo(() => parseInt(queries.limit || DEFAULT_PAGE_SIZE.toString(), 10), [queries.limit]);
  const offset = useMemo(() => parseInt(queries.offset || '0', 10), [queries.offset]);
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const { data: requetes, isFetching } = useRequetesEntite({
    ...(queries.sort && { sort: queries.sort as 'requeteId' | 'entiteId' }),
    ...(queries.order && { order: queries.order as 'asc' | 'desc' }),
    offset: offset.toString(),
    limit: limit.toString(),
  });

  const [title, setTitle] = useState<string>('Requêtes');

  useEffect(() => {
    if (requetes) {
      setTitle(`Requêtes: ${requetes?.meta?.total ?? 0}`);
    }
  }, [requetes]);

  const columns: Column<RequeteEntiteRow>[] = [
    { key: 'custom:number', label: 'ID Requête' },
    { key: 'custom:createdAt', label: 'Réception' },
    { key: 'custom:lieu', label: 'Lieu de survenue' },
    { key: 'custom:misEnCause', label: 'Mis en cause' },
    { key: 'custom:Attribution', label: 'Attribution' },
    { key: 'custom:statut', label: 'Statut' },
    { key: 'custom:action', label: 'Action' },
  ];

  const cells: Cells<RequeteEntiteRow> = {
    'custom:number': (row) => row.requeteId,
    'custom:action': (row) => (
      <Link to="/request/$requestId" params={{ requestId: row.requeteId }}>
        Voir la requête
      </Link>
    ),
    'custom:createdAt': (row) => (
      <div>
        {new Date(row.requete.createdAt).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}
      </div>
    ),
    'custom:statut': (row) => {
      const statutId = row.requeteEtape?.[0]?.statutId;
      return statutId ? requeteStatutType[statutId as RequeteStatutType] : '';
    },
    'custom:lieu': () => '-',
    'custom:misEnCause': () => '-',
    'custom:Attribution': (row) => row.entiteId.slice(0, 8),
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

  // Transform data to have id field for DataTable
  const dataWithId = useMemo(() => {
    return (requetes?.data ?? []).map((row) => ({
      ...row,
      id: row.requeteId,
    }));
  }, [requetes?.data]);

  return (
    <>
      <DataTable title={title} rowId="id" data={dataWithId} columns={columns} cells={cells} isLoading={isFetching} />
      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </>
  );
}
