import { fr } from '@codegouvfr/react-dsfr';
import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import type { StatisticsCard } from '@/lib/api/fetchStatistics';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import styles from './statistiques.module.css';

const numberFormatter = new Intl.NumberFormat('fr-FR');

export const Route = createFileRoute('/_auth/_user/statistiques')({
  beforeLoad: requireAuthAndRoles([
    ROLES.READER,
    ROLES.WRITER,
    ROLES.ENTITY_ADMIN,
    ROLES.NATIONAL_STEERING,
    ROLES.SUPER_ADMIN,
  ]),
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

function RouteComponent() {
  const resolvedFlagsQuery = useResolvedFeatureFlags();
  const { data: profile, isPending: isProfilePending } = useProfile();

  const isSuperAdmin = profile?.roleId === ROLES.SUPER_ADMIN;
  const hasEntityLink = profile != null && (isSuperAdmin || profile.entiteId != null);

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
        {({ data }) =>
          data.cards.length === 0 ? (
            <p>Aucune carte configurée dans le dashboard Metabase.</p>
          ) : (
            <dl className={styles['kpi-grid']}>
              {data.cards.map((card) => (
                <KpiCard key={`${card.dashcardId}-${card.id}`} card={card} />
              ))}
            </dl>
          )
        }
      </QueryStateHandler>
    </div>
  );
}
