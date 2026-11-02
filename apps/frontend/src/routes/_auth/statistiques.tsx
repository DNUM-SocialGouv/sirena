import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Tabs } from '@codegouvfr/react-dsfr/Tabs';
import { ROLES, ROLES_STATISTICS } from '@sirena/common/constants';
import { createFileRoute, Navigate, useNavigate, useSearch } from '@tanstack/react-router';
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { HelpTooltip } from '@/components/common/HelpTooltip';
import { AuthLayout } from '@/components/layout/auth/layout';
import { QueryErrorState, QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { parseCard } from '@/components/statistics/chartData';
import { DashboardFilters } from '@/components/statistics/DashboardFilters';
import { DownloadCsvButton } from '@/components/statistics/DownloadCsvButton';
import { groupCardsByTab, resolveSelectedTab } from '@/components/statistics/dashboardTabs';
import { ExportRequetesMenu } from '@/components/statistics/ExportRequetesMenu';
import { type DashboardFilterKey, resolveAvailableFilters } from '@/components/statistics/filterAvailability';
import { PERIOD_PRESETS, type PeriodSelection, resolveDateRange } from '@/components/statistics/period';
import { StatChart } from '@/components/statistics/StatChart';
import { StatTable } from '@/components/statistics/StatTable';
import { parseTable } from '@/components/statistics/tableData';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import { useDebounce } from '@/hooks/useDebounce';
import type { StatisticsCard, StatisticsDashboard } from '@/lib/api/fetchStatistics';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { splitCsv } from '@/utils/filters';
import styles from './statistiques.module.css';

const numberFormatter = new Intl.NumberFormat('fr-FR');
const dataDateFormatter = new Intl.DateTimeFormat('fr-FR');

const PAGE_TITLE = 'Indicateurs - SIRENA';

// One dashboard view costs a dozen Metabase requests: without this window a burst of filter clicks
// fires one wave per click, and Metabase answers 503.
const FILTERS_DEBOUNCE_MS = 300;

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
  lieuTypes: z.string().optional().catch(undefined),
  tab: z.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/statistiques')({
  beforeLoad: requireAuthAndRoles([...ROLES_STATISTICS]),
  validateSearch: StatisticsSearchSchema,
  head: () => ({
    meta: [{ title: PAGE_TITLE }],
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
      <span className={`${fr.cx('fr-text--md', 'fr-mb-0')} ${styles['kpi-label']}`}>
        <span className={`${fr.cx('fr-text--bold')} ${styles['kpi-name']}`}>{card.name}</span>{' '}
        <HelpTooltip description={card.description} />
      </span>
    </p>
  );
}

function isKpiCard(card: StatisticsCard): boolean {
  return card.display === 'scalar' || getScalarValue(card) !== undefined;
}

// Metabase grid: 24 columns. The position (col + size_x) and the order (row, col) are honoured.
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

function CardsGrid({ cards, isUpdating }: { cards: StatisticsCard[]; isUpdating: boolean }) {
  const sortedCards = [...cards].sort(byGridPosition);
  return (
    <div
      className={`${styles['mb-grid']}${isUpdating ? ` ${styles['mb-grid--updating']}` : ''}`}
      aria-busy={isUpdating}
    >
      {sortedCards.map((card) => (
        <section key={`${card.dashcardId}-${card.id}`} className={styles['mb-cell']} style={cellStyle(card)}>
          <CardContent card={card} />
        </section>
      ))}
    </div>
  );
}

type DashboardContentProps = {
  dashboard: StatisticsDashboard;
  requestedTabId: number | undefined;
  onTabChange: (tabId: string) => void;
  renderFilters: (available: ReadonlySet<DashboardFilterKey>) => ReactNode;
  isUpdating: boolean;
};

function DashboardContent({
  dashboard,
  requestedTabId,
  onTabChange,
  renderFilters,
  isUpdating,
}: DashboardContentProps) {
  const cards = Array.isArray(dashboard.cards) ? dashboard.cards : [];
  const tabs = Array.isArray(dashboard.tabs) ? dashboard.tabs : [];
  const selectedTab = tabs.length > 1 ? resolveSelectedTab(tabs, requestedTabId) : null;

  const pageTitle = selectedTab ? `${selectedTab.name} - ${PAGE_TITLE}` : PAGE_TITLE;
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  if (cards.length === 0) {
    return <p>Aucune carte configurée dans le dashboard Metabase.</p>;
  }

  if (!selectedTab) {
    return (
      <>
        {renderFilters(resolveAvailableFilters(cards, cards))}
        <CardsGrid cards={cards} isUpdating={isUpdating} />
      </>
    );
  }

  const sections = groupCardsByTab(tabs, cards);
  const selectedSection = sections.find((section) => section.tab.id === selectedTab.id);
  const selectedCards = selectedSection?.cards ?? [];

  return (
    <Tabs
      label="Onglets des indicateurs"
      tabs={sections.map(({ tab }) => ({ tabId: String(tab.id), label: tab.name }))}
      selectedTabId={String(selectedTab.id)}
      onTabChange={onTabChange}
      className={styles['dashboard-tabs']}
    >
      {renderFilters(resolveAvailableFilters(selectedCards, cards))}
      {selectedCards.length > 0 ? (
        <CardsGrid cards={selectedCards} isUpdating={isUpdating} />
      ) : (
        <p>Aucune carte dans cet onglet.</p>
      )}
    </Tabs>
  );
}

function CardHeading({ card, action }: { card: StatisticsCard; action?: ReactNode }) {
  return (
    <div className={styles['card-title']}>
      <h2 className={fr.cx('fr-text--md', 'fr-text--bold', 'fr-mb-0')}>{card.name}</h2>
      <HelpTooltip description={card.description} />
      {action}
    </div>
  );
}

function UnavailableCard({ card }: { card: StatisticsCard }) {
  return (
    <>
      <CardHeading card={card} />
      <p>Données non disponibles.</p>
    </>
  );
}

function ChartCard({ card }: { card: StatisticsCard }) {
  if (card.display === 'pie') {
    const parsed = parseCard(card.data);
    if (!parsed) return <UnavailableCard card={card} />;
    return (
      <StatChart
        name={card.name}
        description={card.description}
        parsed={parsed}
        action={<DownloadCsvButton card={card} />}
      />
    );
  }

  // Outside pie charts, the card is rendered as Metabase returns it: every column included.
  const table = parseTable(card.data);
  if (!table) return <UnavailableCard card={card} />;

  return (
    <>
      <CardHeading card={card} action={<DownloadCsvButton card={card} />} />
      <StatTable caption={card.name} table={table} hideCaption />
    </>
  );
}

export function RouteComponent() {
  const { data: profile, isPending: isProfilePending } = useProfile();
  const search = useSearch({ from: '/_auth/statistiques' });
  const navigate = useNavigate({ from: '/statistiques' });

  // Super admin: national scope, with no entity link. The backend switches to the national dashboard
  // on its own; the UI requires no entity and hides the export, which is entity-scoped.
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
  const selectedLieuTypes = useMemo(() => splitCsv(search.lieuTypes), [search.lieuTypes]);

  const filters = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      domaineIds: search.domaineIds,
      includeEIG: search.includeEIG,
      lieuTypes: search.lieuTypes,
    }),
    [range.startDate, range.endDate, search.domaineIds, search.includeEIG, search.lieuTypes],
  );
  const debouncedFilters = useDebounce(filters, FILTERS_DEBOUNCE_MS);
  // Compared by value, not by reference: checking then unchecking inside the debounce window gives
  // a new object with the same filters, and no update to wait for.
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const debouncedFiltersKey = useMemo(() => JSON.stringify(debouncedFilters), [debouncedFilters]);
  const query = useStatisticsDashboard(debouncedFilters, canView);
  const [hasRequestedUpdate, setHasRequestedUpdate] = useState(false);
  // A failed update must not take the page down: that would remove the filter bar too, leaving no
  // way back to the filter that caused the error.
  const [lastDashboard, setLastDashboard] = useState<StatisticsDashboard | null>(null);

  const isFetching = query.isFetching;
  useEffect(() => {
    if (isFetching) setHasRequestedUpdate(true);
  }, [isFetching]);

  const dashboard = query.data;
  useEffect(() => {
    if (dashboard) setLastDashboard(dashboard);
  }, [dashboard]);

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

  const handleLieuTypeChange = useCallback(
    (tokens: string[]) => {
      navigate({ search: (prev) => ({ ...prev, lieuTypes: tokens.length > 0 ? tokens.join(',') : undefined }) });
    },
    [navigate],
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      navigate({ search: (prev) => ({ ...prev, tab: Number(tabId) }) });
    },
    [navigate],
  );

  const renderFilters = (available: ReadonlySet<DashboardFilterKey>) => (
    <DashboardFilters
      available={available}
      period={selection}
      onPeriodChange={handlePeriodChange}
      selectedDomaines={selectedDomaines}
      onDomaineChange={handleDomaineChange}
      selectedLieuTypes={selectedLieuTypes}
      onLieuTypeChange={handleLieuTypeChange}
      includeEIG={search.includeEIG !== false}
      onIncludeEIGChange={handleIncludeEIGChange}
    />
  );

  if (isProfilePending) {
    return null;
  }
  if (!canView) {
    return <Navigate to={isSuperAdmin ? '/admin/users' : '/home'} />;
  }

  // The request has not left yet during the debounce window: the busy state covers that wait too,
  // otherwise it flickers between the click and the update.
  const isUpdating = query.isFetching || debouncedFiltersKey !== filtersKey;
  // A live region that only announces entering the wait leaves the user hanging: the exit is
  // announced too, once, since the text does not change afterwards (RGAA 7.5).
  const statusMessage = isUpdating
    ? 'Mise à jour des indicateurs en cours…'
    : hasRequestedUpdate
      ? 'Indicateurs mis à jour.'
      : '';

  return (
    <AuthLayout>
      <div className={fr.cx('fr-mb-8w')}>
        <div className={styles['page-header']}>
          <h1 className="fr-mb-0">Indicateurs</h1>
          {!isSuperAdmin && <ExportRequetesMenu />}
        </div>
        <p role="status" className="fr-sr-only" aria-live="polite">
          {statusMessage}
        </p>
        <QueryStateHandler
          query={query}
          noDataComponent={<p>Aucune carte configurée dans le dashboard Metabase.</p>}
          errorComponent={() =>
            lastDashboard ? (
              <>
                <Alert
                  severity="warning"
                  small
                  description="La mise à jour des indicateurs a échoué. Les chiffres affichés sont ceux de la dernière mise à jour réussie."
                  className={fr.cx('fr-mb-3w')}
                />
                <DashboardContent
                  dashboard={lastDashboard}
                  requestedTabId={search.tab}
                  onTabChange={handleTabChange}
                  renderFilters={renderFilters}
                  isUpdating={false}
                />
              </>
            ) : (
              <QueryErrorState />
            )
          }
        >
          {({ data }) => (
            <DashboardContent
              dashboard={data}
              requestedTabId={search.tab}
              onTabChange={handleTabChange}
              renderFilters={renderFilters}
              isUpdating={isUpdating}
            />
          )}
        </QueryStateHandler>
        <p className={`${fr.cx('fr-text--sm', 'fr-mt-6w', 'fr-mb-0')} ${styles['data-note']}`}>
          <span className={fr.cx('fr-icon-time-line')} aria-hidden="true" />
          Données du {dataDate}
        </p>
      </div>
    </AuthLayout>
  );
}
