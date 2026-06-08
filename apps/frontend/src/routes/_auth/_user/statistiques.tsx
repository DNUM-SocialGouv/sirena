import { fr } from '@codegouvfr/react-dsfr';
import { FEATURE_FLAGS, ROLES_READ } from '@sirena/common/constants';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { parseCard } from '@/components/statistics/chartData';
import { StatChart } from '@/components/statistics/StatChart';
import { StatTable } from '@/components/statistics/StatTable';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import styles from './statistiques.module.css';

const numberFormatter = new Intl.NumberFormat('fr-FR');

export const Route = createFileRoute('/_auth/_user/statistiques')({
  beforeLoad: requireAuthAndRoles([...ROLES_READ]),
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
  if (card.data.length !== 1) return undefined;
  const [row] = card.data;
  const keys = Object.keys(row);
  if (keys.length !== 1) return undefined;
  const [key] = keys;
  return row[key];
}

function KpiCard({ card }: { card: StatisticsCard }) {
  const value = getScalarValue(card);
  const display = value !== undefined ? formatValue(value) : '—';

  return (
    <div className={styles['kpi-card']}>
      <dt className={styles['kpi-label']}>{card.name}</dt>
      <dd className={styles['kpi-value']}>{display}</dd>
    </div>
  );
}

function isScalarCard(card: StatisticsCard): boolean {
  return card.display === 'scalar' || getScalarValue(card) !== undefined;
}

function ChartCard({ card }: { card: StatisticsCard }) {
  const parsed = parseCard(card.data);
  if (!parsed) {
    return null;
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
        hideCaption
      />
    </>
  );
}

function RouteComponent() {
  const resolvedFlagsQuery = useResolvedFeatureFlags();
  const { data: profile, isPending: isProfilePending } = useProfile();

  const hasEntityLink = profile?.entiteId != null;

  const areFlagsReady = resolvedFlagsQuery.status !== 'pending';
  const isEnabled = resolvedFlagsQuery.data?.[FEATURE_FLAGS.STATISTICS] ?? false;
  const query = useStatisticsDashboard(areFlagsReady && isEnabled && hasEntityLink);

  if (isProfilePending || !areFlagsReady) {
    return null;
  }
  if (!isEnabled || !hasEntityLink) {
    return <Navigate to="/home" />;
  }

  return (
    <div className={fr.cx('fr-container', 'fr-my-8w')}>
      <h1>Indicateurs</h1>
      <QueryStateHandler query={query} noDataComponent={<p>Aucune carte configurée dans le dashboard Metabase.</p>}>
        {({ data }) => {
          if (data.cards.length === 0) {
            return <p>Aucune carte configurée dans le dashboard Metabase.</p>;
          }

          const scalarCards = data.cards.filter(isScalarCard);
          const chartCards = data.cards.filter((card) => !isScalarCard(card));

          return (
            <>
              {scalarCards.length > 0 && (
                <dl className={styles['kpi-grid']}>
                  {scalarCards.map((card) => (
                    <KpiCard key={`${card.dashcardId}-${card.id}`} card={card} />
                  ))}
                </dl>
              )}
              {chartCards.map((card) => (
                <section key={`${card.dashcardId}-${card.id}`} className={fr.cx('fr-mt-6w')}>
                  <ChartCard card={card} />
                </section>
              ))}
            </>
          );
        }}
      </QueryStateHandler>
    </div>
  );
}
