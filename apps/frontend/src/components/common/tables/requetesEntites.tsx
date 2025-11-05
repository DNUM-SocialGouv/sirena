import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { SearchBar } from '@codegouvfr/react-dsfr/SearchBar';
import { REQUETE_STATUT_TYPES, type RequeteStatutType, requeteStatutType } from '@sirena/common/constants';
import { type Cells, type Column, DataTable } from '@sirena/ui';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';
import { renderMisEnCauseCell, renderMotifsCell } from './requetesEntites.cells';

type RequeteEntiteRow = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number] & {
  id: string;
};

const DEFAULT_PAGE_SIZE = 10;

const statutSeverity = {
  [REQUETE_STATUT_TYPES.EN_COURS]: 'info',
  [REQUETE_STATUT_TYPES.A_FAIRE]: 'new',
  [REQUETE_STATUT_TYPES.FAIT]: 'success',
  [REQUETE_STATUT_TYPES.CLOTUREE]: 'error',
} as const;

export function RequetesEntite() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });

  const limit = useMemo(() => parseInt(queries.limit || DEFAULT_PAGE_SIZE.toString(), 10), [queries.limit]);
  const offset = useMemo(() => parseInt(queries.offset || '0', 10), [queries.offset]);
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const [searchTerm, setSearchTerm] = useState<string>(queries.search || '');

  const { data: requetes, isFetching } = useRequetesEntite({
    ...(queries.sort && { sort: queries.sort as 'requeteId' | 'entiteId' }),
    ...(queries.order && { order: queries.order as 'asc' | 'desc' }),
    ...(queries.search && { search: queries.search }),
    offset: offset.toString(),
    limit: limit.toString(),
  });

  const [title, setTitle] = useState<string>('Requêtes');

  useEffect(() => {
    if (requetes) {
      setTitle(`Requêtes: ${requetes?.meta?.total ?? 0}`);
    }
  }, [requetes]);

  const handleSearch = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: searchTerm.trim() || undefined,
        offset: undefined, // Reset to first page
      }),
    });
  }, [navigate, searchTerm]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        offset: undefined,
      }),
    });
  }, [navigate]);

  const columns: Column<RequeteEntiteRow>[] = [
    { key: 'requete.id', label: 'ID Requête' },
    { key: 'custom:statut', label: 'Statut' },
    { key: 'requete.receptionDate', label: 'Réception' },
    { key: 'custom:priorite', label: 'Priorité' },
    { key: 'custom:personne', label: 'Personne Concernée' },
    { key: 'custom:motifs', label: 'Motifs' },
    { key: 'custom:misEnCause', label: 'Mis en cause' },
    { key: 'custom:action', label: 'Action', isFixedRight: true },
  ];

  const cells: Cells<RequeteEntiteRow> = {
    'requete.id': (row) => <span className="one-line">{row.requete.id}</span>,
    'requete.receptionDate': (row) => (
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
      const severity = statutId ? statutSeverity[statutId as RequeteStatutType] : undefined;
      const label = statutId ? requeteStatutType[statutId as RequeteStatutType] : 'Inconnu';
      return severity ? (
        <Badge noIcon severity={severity} className="one-line">
          {label}
        </Badge>
      ) : (
        ''
      );
    },
    'custom:personne': (row) => {
      const requete = row.requete as typeof row.requete & {
        participant?: { estVictime?: boolean; identite?: { prenom: string; nom: string } } | null;
      };
      const { participant } = requete;
      if (participant?.identite) {
        return (
          <span className="one-line">
            {participant.identite.prenom} {participant.identite.nom}
          </span>
        );
      }
      return '-';
    },
    'custom:motifs': renderMotifsCell,
    'custom:misEnCause': renderMisEnCauseCell,
    'custom:action': (row) => (
      <Link to="/request/$requestId" className="one-line" params={{ requestId: row.requeteId }}>
        Voir la requête
      </Link>
    ),
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
      <div className="fr-mb-3w">
        <div className="fr-grid-row">
          <div className="fr-col-12 fr-col-md-5">
            <SearchBar
              label="Rechercher dans les requêtes"
              onButtonClick={handleSearch}
              renderInput={(inputProps) => (
                <input
                  {...inputProps}
                  placeholder="Rechercher par numéro, lieu de survenue, ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              )}
            />
          </div>
        </div>

        {queries.search && requetes && (
          <div className="fr-mt-2w">
            <div className="fr-grid-row fr-grid-row--middle">
              <div className="fr-col-auto">
                <p className="fr-text--md fr-mb-0">
                  <strong>{requetes.meta?.total ?? 0}</strong> résultat{requetes.meta?.total !== 1 ? 's' : ''} pour "
                  {queries.search}"
                </p>
              </div>
              <div className="fr-col-auto fr-ml-1w">
                <Button
                  type="button"
                  priority="secondary"
                  iconId="fr-icon-delete-line"
                  iconPosition="right"
                  size="small"
                  onClick={handleClearSearch}
                  className="fr-btn--icon-center center-icon-with-sr-only"
                  aria-label="Effacer la recherche"
                  title="Effacer la recherche"
                >
                  Effacer la recherche
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <DataTable title={title} rowId="id" data={dataWithId} columns={columns} cells={cells} isLoading={isFetching} />
      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </>
  );
}
