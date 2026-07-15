import { fr } from '@codegouvfr/react-dsfr';
import { FEATURE_FLAGS, ROLES_READ } from '@sirena/common/constants';
import { createFileRoute, Navigate, useNavigate, useSearch } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import { z } from 'zod';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { parseCard } from '@/components/statistics/chartData';
import { ExportRequetesButton } from '@/components/statistics/ExportRequetesButton';
import { PeriodFilter } from '@/components/statistics/PeriodFilter';
import { describePeriod, PERIOD_PRESETS, type PeriodSelection, resolveDateRange } from '@/components/statistics/period';
import { StatChart } from '@/components/statistics/StatChart';
import { StatTable } from '@/components/statistics/StatTable';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { requireAuthAndRoles } from '@/lib/auth-guards';
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
});

export const Route = createFileRoute('/_auth/_user/statistiques')({
  beforeLoad: requireAuthAndRoles([...ROLES_READ]),
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
      <span className={styles['kpi-value']}>{display}</span>
      <span className={styles['kpi-label']}>{card.name}</span>
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
        <h2 className={fr.cx('fr-h5')}>{card.name}</h2>
        <p>Données non disponibles.</p>
      </>
    );
  }

  if (card.display === 'pie') {
    return <StatChart name={card.name} parsed={parsed} />;
  }

  return (
    <>
      <h2 className={fr.cx('fr-h5')}>{card.name}</h2>
      <StatTable
        caption={card.name}
        items={parsed.items}
        total={parsed.total}
        dimensionLabel={parsed.dimensionLabel}
        metricLabel={parsed.metricLabel}
        percentLabel={parsed.percentLabel}
        hasPrecomputedPercent={parsed.hasPrecomputedPercent}
        hideCaption
      />
    </>
  );
}

export function RouteComponent() {
  const resolvedFlagsQuery = useResolvedFeatureFlags();
  const { data: profile, isPending: isProfilePending } = useProfile();
  const search = useSearch({ from: '/_auth/_user/statistiques' });
  const navigate = useNavigate({ from: '/statistiques' });

  const hasEntityLink = profile?.entiteId != null;

  const areFlagsReady = resolvedFlagsQuery.status !== 'pending';
  const isEnabled = resolvedFlagsQuery.data?.[FEATURE_FLAGS.STATISTICS] ?? false;
  const selection: PeriodSelection = {
    period: search.period,
    startDate: search.startDate,
    endDate: search.endDate,
  };
  const range = resolveDateRange(selection, new Date());
  const dataDate = formatDataDate(new Date());
  const query = useStatisticsDashboard(range, areFlagsReady && isEnabled && hasEntityLink);

  const handlePeriodChange = (next: PeriodSelection) => {
    navigate({
      search: (prev) => ({ ...prev, period: next.period, startDate: next.startDate, endDate: next.endDate }),
    });
  };

  if (isProfilePending || !areFlagsReady) {
    return null;
  }
  if (!isEnabled || !hasEntityLink) {
    return <Navigate to="/home" />;
  }

  const periodLabel = describePeriod(selection);
  const statusMessage = query.isFetching
    ? 'Mise à jour des indicateurs en cours…'
    : query.isSuccess
      ? `Indicateurs à jour${periodLabel ? ` pour la période : ${periodLabel}` : ''}.`
      : '';

  return (
    <div className={fr.cx('fr-container', 'fr-my-8w')}>
      <div className={styles['page-header']}>
        <h1 className="fr-mb-0">Indicateurs</h1>
        <ExportRequetesButton />
      </div>
      <PeriodFilter value={selection} onChange={handlePeriodChange} />
      <p role="status" className="fr-sr-only">
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
  );
}
