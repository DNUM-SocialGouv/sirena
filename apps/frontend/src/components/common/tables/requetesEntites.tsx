import { Button } from '@codegouvfr/react-dsfr/Button';
import { Pagination } from '@codegouvfr/react-dsfr/Pagination';
import { SearchBar } from '@codegouvfr/react-dsfr/SearchBar';
import type { RequetePrioriteType, RequeteStatutType } from '@sirena/common/constants';
import { entiteTypes, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { type Cells, type Column, DataTable, type OnSortChangeParams } from '@sirena/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useRequetesEntite } from '@/hooks/queries/requetesEntite.hook';
import { useRequetesListSSE } from '@/hooks/useRequetesListSSE';
import { RequetePrioriteTag, RequeteStatutTag } from '../RequeteStatutTag';
import { renderAffectationCell, renderMisEnCauseCell, renderMotifsCell } from './requetesEntites.cells';
import { RequetesEntiteQuickFilters } from './requetesEntites.filters';
import './requetesEntites.css';
import Badge from '@codegouvfr/react-dsfr/Badge';

type RequeteEntiteRow = NonNullable<Awaited<ReturnType<typeof useRequetesEntite>>['data']>['data'][number] & {
  id: string;
};

const DEFAULT_PAGE_SIZE = 10;

type SortDir = 'asc' | 'desc' | undefined;

const shouldInvertSortDirection = (columnKey: string) =>
  columnKey === 'custom:statut' || columnKey === 'custom:priorite';

const uiDirToBackendOrder = (columnKey: string, dir: SortDir): SortDir => {
  if (!dir) return undefined;
  if (!shouldInvertSortDirection(columnKey)) return dir;
  return dir === 'asc' ? 'desc' : 'asc';
};

const backendOrderToUiDir = (columnKey: string, order: SortDir): SortDir => {
  if (!order) return undefined;
  if (!shouldInvertSortDirection(columnKey)) return order;
  return order === 'asc' ? 'desc' : 'asc';
};

const mapColumnKeyToSortKey = (columnKey: string): string | undefined => {
  switch (columnKey) {
    case 'requete.id':
      return 'requete.id';
    case 'requete.receptionDate':
      return 'requete.createdAt';
    case 'custom:statut':
      return 'statutId';
    case 'custom:priorite':
      return 'priorite.sortOrder';
    case 'custom:personne':
      return 'requete.participant.identite.nom';
    default:
      return undefined;
  }
};

const mapSortKeyToColumnKey = (sortKey: string | undefined): string => {
  switch (sortKey) {
    case 'requete.id':
      return 'requete.id';
    case 'requeteId':
      return 'requete.id';
    case 'requete.createdAt':
      return 'requete.receptionDate';
    case 'statutId':
      return 'custom:statut';
    case 'prioriteId':
      return 'custom:priorite';
    case 'priorite.sortOrder':
      return 'custom:priorite';
    case 'requete.participant.identite.nom':
      return 'custom:personne';
    default:
      return '';
  }
};

const SSE_DEBOUNCE_MS = 500;

export function RequetesEntite() {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: profile } = useProfile();
  const userTopEntiteId = profile?.topEntiteId;
  const isTopEntiteARS = profile?.topEntiteTypeId === entiteTypes.ARS;

  const handleUpdate = useCallback(() => {
    // Debounce multiple rapid SSE events to prevent excessive refreshes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['requetesEntite'] });
      debounceTimerRef.current = null;
    }, SSE_DEBOUNCE_MS);
  }, [queryClient]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useRequetesListSSE({ onUpdate: handleUpdate });

  const limit = queries.limit ?? DEFAULT_PAGE_SIZE;
  const offset = queries.offset ?? 0;
  const currentPage = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);

  const [searchTerm, setSearchTerm] = useState<string>(queries.search || '');

  const { data: requetes, isFetching } = useRequetesEntite({
    ...(queries.sort && { sort: queries.sort }),
    ...(queries.order && { order: queries.order as 'asc' | 'desc' }),
    ...(queries.search && { search: queries.search }),
    ...(queries.entiteId ? { entiteId: queries.entiteId } : {}),
    ...(queries.departementCodes ? { departementCodes: queries.departementCodes } : {}),
    ...(queries.prioriteId ? { prioriteId: queries.prioriteId } : {}),
    offset,
    limit,
  });

  const [title, setTitle] = useState<string>('Requêtes');

  useEffect(() => {
    if (requetes) {
      setTitle(`Liste des requêtes: ${requetes?.meta?.total ?? 0}`);
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

  const handleSortChange = useCallback(
    (params: OnSortChangeParams<RequeteEntiteRow>) => {
      const { sort: columnKey, sortDirection } = params;
      const sortKey = mapColumnKeyToSortKey(columnKey);

      const backendOrder = uiDirToBackendOrder(columnKey, sortDirection as SortDir);

      navigate({
        search: (prev) => ({
          ...prev,
          sort: sortKey && backendOrder ? sortKey : undefined,
          order: sortKey && backendOrder ? (backendOrder as 'asc' | 'desc') : undefined,
          offset: undefined,
        }),
      });
    },
    [navigate],
  );

  const currentSort = useMemo((): OnSortChangeParams<RequeteEntiteRow> => {
    const sortKey = queries.sort;
    const columnKey = mapSortKeyToColumnKey(sortKey);

    const uiDirection = backendOrderToUiDir(columnKey, (queries.order || undefined) as SortDir);

    return {
      sort: (columnKey || '') as OnSortChangeParams<RequeteEntiteRow>['sort'],
      sortDirection: (uiDirection || '') as OnSortChangeParams<RequeteEntiteRow>['sortDirection'],
    };
  }, [queries.sort, queries.order]);

  const columns: Column<RequeteEntiteRow>[] = [
    {
      key: 'requete.id',
      label: 'ID Requête',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par numéro de requête croissant',
        desc: 'Trier par numéro de requête décroissant',
        reset: 'Réinitialiser le tri de la requête',
      },
    },
    {
      key: 'custom:statut',
      label: 'Statut',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par statut',
        desc: 'Trier par statut',
        reset: 'Réinitialiser le tri du statut',
      },
    },
    {
      key: 'requete.receptionDate',
      label: 'Date de création',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par date de création du plus ancien au plus récent',
        desc: 'Trier par date de création du plus récent au plus ancien',
        reset: 'Réinitialiser le tri de la date de création',
      },
    },
    {
      key: 'custom:priorite',
      label: 'Priorité',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par priorité de la plus haute à la plus basse',
        desc: 'Trier par priorité de la plus basse à la plus haute',
        reset: 'Réinitialiser le tri de la priorité',
      },
    },
    { key: 'custom:affectation', label: 'Affectation' },
    { key: 'custom:misEnCause', label: 'Mis en cause' },
    { key: 'custom:motifs', label: 'Motifs' },
    ...(isTopEntiteARS
      ? [{ key: 'custom:departement', label: 'Département lieu de survenue' } as Column<RequeteEntiteRow>]
      : []),
    {
      key: 'custom:personne',
      label: 'Personne Concernée',
      isSortable: true,
      sortLabels: {
        asc: 'Trier par nom de A à Z',
        desc: 'Trier par nom de Z à A',
        reset: 'Réinitialiser le tri de la personne concernée',
      },
    },
  ];

  const cells: Cells<RequeteEntiteRow> = {
    'requete.id': (row) => (
      <Link to="/request/$requestId" params={{ requestId: row.requeteId }}>
        Voir {row.requete.id}
      </Link>
    ),
    'requete.receptionDate': (row) => {
      const createdAt = new Date(row.requete.createdAt);
      const isOpen = row.statutId === REQUETE_STATUT_TYPES.NOUVEAU || row.statutId === REQUETE_STATUT_TYPES.EN_COURS;
      const today = new Date();
      const todayMidnight = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const createdAtMidnight = Date.UTC(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
      const isOver90Days = isOpen && todayMidnight - createdAtMidnight >= 90 * 24 * 60 * 60 * 1000;
      return (
        <div className="requetesEntitesTable__reception-date-cell">
          {createdAt.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          {isOver90Days && (
            <Badge severity="warning" noIcon small>
              <span className="fr-sr-only">Requête reçue depuis</span>+90 jours
            </Badge>
          )}
        </div>
      );
    },
    'custom:statut': (row) => {
      return (
        <div className="requetesEntitesTable__statut-cell">
          <RequeteStatutTag statut={row.statutId as RequeteStatutType} noIcon={true} />
        </div>
      );
    },
    'custom:priorite': (row) =>
      row.prioriteId ? <RequetePrioriteTag statut={row.prioriteId as RequetePrioriteType} noIcon /> : null,
    'custom:personne': (row) => {
      const requete = row.requete as typeof row.requete & {
        participant?: { estVictime?: boolean; identite?: { prenom: string; nom: string } } | null;
      };
      const { participant } = requete;
      if (!participant?.identite) return null;

      return (
        <span className="one-line">
          {participant.identite.prenom} <span className="lastname">{participant.identite.nom}</span>
        </span>
      );
    },
    'custom:affectation': (row) => (userTopEntiteId ? renderAffectationCell(row, userTopEntiteId) : '-'),
    'custom:motifs': (row) => <div className="requetesEntitesTable__motifs-cell">{renderMotifsCell(row)}</div>,
    'custom:misEnCause': (row) => (
      <div className="requetesEntitesTable__misEnCause-cell">{renderMisEnCauseCell(row)}</div>
    ),
    ...(isTopEntiteARS
      ? {
          'custom:departement': (row: RequeteEntiteRow) => {
            const depts = row.departementsLieuSurvenue;
            if (!depts?.length) return null;
            return (
              <ul>
                {depts.map((dept) => (
                  <li key={dept.code}>{dept.lib ? `${dept.code} - ${dept.lib}` : dept.code}</li>
                ))}
              </ul>
            );
          },
        }
      : {}),
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
              offset: newOffset === 0 ? undefined : newOffset,
              limit: limit === DEFAULT_PAGE_SIZE ? undefined : limit,
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
            <p className="fr-label fr-mb-1v" aria-hidden="true">
              Rechercher dans les requêtes par numéro, lieu de survenue, ...
            </p>
            <SearchBar
              label="Rechercher dans les requêtes par numéro, lieu de survenue, ..."
              onButtonClick={handleSearch}
              renderInput={(inputProps) => (
                <input
                  {...inputProps}
                  placeholder=""
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
      <div className="requetesEntitesTable">
        <RequetesEntiteQuickFilters />
        <DataTable
          title={title}
          rowId="id"
          data={dataWithId}
          columns={columns}
          cells={cells}
          isLoading={isFetching}
          sort={currentSort}
          onSortChange={handleSortChange}
        />
      </div>
      {shouldShowPagination && (
        <div className="fr-mt-3w fr-grid-row fr-grid-row--center">
          <Pagination count={totalPages} defaultPage={currentPage} getPageLinkProps={getPageLinkProps} />
        </div>
      )}
    </>
  );
}
