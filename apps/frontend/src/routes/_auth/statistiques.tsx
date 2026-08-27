import { fr } from '@codegouvfr/react-dsfr';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { ROLES, ROLES_STATISTICS } from '@sirena/common/constants';
import { createFileRoute, Navigate, useNavigate, useSearch } from '@tanstack/react-router';
import { type CSSProperties, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { CheckboxFilter } from '@/components/common/filters/CheckboxFilter';
import { DomaineFilter } from '@/components/common/filters/DomaineFilter';
import { AuthLayout } from '@/components/layout/auth/layout';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { CardHelp } from '@/components/statistics/CardHelp';
import { parseCard } from '@/components/statistics/chartData';
import { DownloadCsvButton } from '@/components/statistics/DownloadCsvButton';
import { ExportRequetesButton } from '@/components/statistics/ExportRequetesButton';
import { PeriodFilter } from '@/components/statistics/PeriodFilter';
import {
  describeCreatedPeriod,
  PERIOD_PRESETS,
  type PeriodSelection,
  resolveDateRange,
} from '@/components/statistics/period';
import { StatChart } from '@/components/statistics/StatChart';
import { StatTable } from '@/components/statistics/StatTable';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { splitCsv } from '@/utils/filters';
import styles from './statistiques.module.css';

const numberFormatter = new Intl.NumberFormat('fr-FR');
const dataDateFormatter = new Intl.DateTimeFormat('fr-FR');

function formatDataDate(reference: Date): string {
  const previousDay = new Date(reference);
  previousDay.setDate(previousDay.getDate() - 1);
  return dataDateFormatter.format(previousDay);
}

const StatisticsSearchSchema = z.object({
  period: z.enum(PERIOD_PRESETS).optional().catch(undefined),
  startDate: z.iso.date().optional().catch(undefined),
  endDate: z.iso.date().optional().catch(undefined),
  domaineIds: z.string().optional().catch(undefined),
  includeEIG: z.boolean().optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/statistiques')({
  beforeLoad: requireAuthAndRoles([...ROLES_STATISTICS]),
  validateSearch: StatisticsSearchSchema,
  head: () => ({
    meta: [{ title: 'Indicateurs - SIRENA' }],
  }),
  component: RouteComponent,
});

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return numberFormatter.format(value);
  if (typeof value === 'string') {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) && value.trim() !== '' ? numberFormatter.format(asNumber) : value;
  }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return JSON.stringify(value);
}

function getScalarValue(card: StatisticsCard): unknown | undefined {
  const { cols, rows } = card.data ?? {};
  if (!Array.isArray(cols) || !Array.isArray(rows)) return undefined;
  if (cols.length !== 1 || rows.length !== 1) return undefined;
  const [row] = rows;
  if (!Array.isArray(row)) return undefined;
  const [value] = row;
  return value;
}

function KpiCard({ card }: { card: StatisticsCard }) {
  const value = getScalarValue(card);
  const display = value !== undefined ? formatValue(value) : '—';

  return (
    <p className={styles['kpi-card']}>
      <span className={styles['kpi-value']}>{display}</span>{' '}
      <span className={styles['kpi-label']}>
        {card.name} <CardHelp description={card.description} />
      </span>
    </p>
  );
}

function isKpiCard(card: StatisticsCard): boolean {
  return card.display === 'scalar' || getScalarValue(card) !== undefined;
}

// Grille Metabase : 24 colonnes. On respecte la position (col + size_x) et l'ordre (row, col).
const GRID_COLUMNS = 24;

function byGridPosition(a: StatisticsCard, b: StatisticsCard): number {
  if (!a.layout || !b.layout) return 0;
  return a.layout.row - b.layout.row || a.layout.col - b.layout.col;
}

function cellStyle(card: StatisticsCard): CSSProperties {
  const colStart = card.layout ? card.layout.col + 1 : 1;
  const colSpan = card.layout ? Math.min(card.layout.sizeX, GRID_COLUMNS) : GRID_COLUMNS;
  return { '--col-start': colStart, '--col-span': colSpan } as CSSProperties;
}

function CardContent({ card }: { card: StatisticsCard }) {
  return isKpiCard(card) ? <KpiCard card={card} /> : <ChartCard card={card} />;
}

function ChartCard({ card }: { card: StatisticsCard }) {
  const parsed = parseCard(card.data);
  if (!parsed) {
    return (
      <>
        <div className={styles['card-title']}>
          <h2 className={fr.cx('fr-h5', 'fr-mb-0')}>{card.name}</h2>
          <CardHelp description={card.description} />
        </div>
        <p>Données non disponibles.</p>
      </>
    );
  }

  if (card.display === 'pie') {
    return (
      <StatChart
        name={card.name}
        description={card.description}
        parsed={parsed}
        action={<DownloadCsvButton card={card} />}
      />
    );
  }

  return (
    <>
      <div className={styles['card-title']}>
        <h2 className={fr.cx('fr-h5', 'fr-mb-0')}>{card.name}</h2>
        <CardHelp description={card.description} />
        <DownloadCsvButton card={card} />
      </div>
      <StatTable caption={card.name} parsed={parsed} hideCaption />
    </>
  );
}

export function RouteComponent() {
  const { data: profile, isPending: isProfilePending } = useProfile();
  const search = useSearch({ from: '/_auth/statistiques' });
  const navigate = useNavigate({ from: '/statistiques' });

  // Super admin : périmètre national (pas de rattachement entité). Le backend bascule automatiquement
  // sur le dashboard national ; côté UI on n'exige pas d'entité et on masque l'export (entité-scopé).
  const isSuperAdmin = profile?.role?.id === ROLES.SUPER_ADMIN;
  const hasEntityLink = profile?.entiteId != null;
  const canView = isSuperAdmin || hasEntityLink;

  const selection: PeriodSelection = {
    period: search.period,
    startDate: search.startDate,
    endDate: search.endDate,
  };
  const range = resolveDateRange(selection, new Date());
  const dataDate = formatDataDate(new Date());
  const selectedDomaines = useMemo(() => splitCsv(search.domaineIds), [search.domaineIds]);
  const query = useStatisticsDashboard(
    { ...range, domaineIds: search.domaineIds, includeEIG: search.includeEIG },
    canView,
  );

  const handlePeriodChange = useCallback(
    (next: PeriodSelection) => {
      navigate({
        search: (prev) => ({ ...prev, period: next.period, startDate: next.startDate, endDate: next.endDate }),
      });
    },
    [navigate],
  );

  const handleDomaineChange = useCallback(
    (ids: string[]) => {
      navigate({ search: (prev) => ({ ...prev, domaineIds: ids.length > 0 ? ids.join(',') : undefined }) });
    },
    [navigate],
  );

  const handleIncludeEIGChange = useCallback(
    (checked: boolean) => {
      navigate({ search: (prev) => ({ ...prev, includeEIG: checked ? undefined : false }) });
    },
    [navigate],
  );

  const clearPeriod = useCallback(
    () => handlePeriodChange({ period: undefined, startDate: undefined, endDate: undefined }),
    [handlePeriodChange],
  );

  const activePeriodLabel = describeCreatedPeriod(selection);

  if (isProfilePending) {
    return null;
  }
  if (!canView) {
    return <Navigate to={isSuperAdmin ? '/admin/users' : '/home'} />;
  }

  const statusMessage = query.isFetching ? 'Mise à jour des indicateurs en cours…' : '';

  return (
    <AuthLayout>
      <div className={fr.cx('fr-container', 'fr-my-8w')}>
        <div className={styles['page-header']}>
          <h1 className="fr-mb-0">Indicateurs</h1>
          {!isSuperAdmin && <ExportRequetesButton />}
        </div>
        <fieldset className={styles.filters}>
          <legend className={fr.cx('fr-label', 'fr-mb-1v')}>Filtrer les indicateurs</legend>
          <div className={styles['filters__controls']}>
            <PeriodFilter value={selection} onChange={handlePeriodChange} />
            <DomaineFilter
              selectedIds={selectedDomaines}
              legend="Filtrer les indicateurs par domaine fonctionnel"
              onChange={handleDomaineChange}
            />
            <CheckboxFilter
              label="Inclure les EIG"
              checked={search.includeEIG !== false}
              onChange={handleIncludeEIGChange}
            />
          </div>
          {activePeriodLabel ? (
            <div className={styles['filters__active']}>
              <Tag
                as="button"
                dismissible
                onClick={clearPeriod}
                nativeButtonProps={{ 'aria-label': `${activePeriodLabel}, retirer le filtre` }}
              >
                {activePeriodLabel}
              </Tag>
            </div>
          ) : null}
        </fieldset>
        <p role="status" className="fr-sr-only" aria-live="polite">
          {statusMessage}
        </p>
        <QueryStateHandler query={query} noDataComponent={<p>Aucune carte configurée dans le dashboard Metabase.</p>}>
          {({ data }) => {
            const cards = Array.isArray(data.cards) ? data.cards : [];
            if (cards.length === 0) {
              return <p>Aucune carte configurée dans le dashboard Metabase.</p>;
            }

            const sortedCards = [...cards].sort(byGridPosition);

            return (
              <div className={styles['mb-grid']}>
                {sortedCards.map((card) => (
                  <section key={`${card.dashcardId}-${card.id}`} className={styles['mb-cell']} style={cellStyle(card)}>
                    <CardContent card={card} />
                  </section>
                ))}
              </div>
            );
          }}
        </QueryStateHandler>
        <p className={`${fr.cx('fr-text--sm', 'fr-mt-6w', 'fr-mb-0')} ${styles['data-note']}`}>
          <span className={fr.cx('fr-icon-time-line')} aria-hidden="true" />
          Données du {dataDate}
        </p>
      </div>
    </AuthLayout>
  );
}
