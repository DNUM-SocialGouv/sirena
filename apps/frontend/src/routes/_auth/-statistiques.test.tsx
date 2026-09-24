import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import { RouteComponent } from './statistiques';

const searchState = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
const navigate = vi.fn(({ search }: { search?: (prev: object) => Record<string, unknown> }) => {
  if (typeof search === 'function') {
    searchState.current = search(searchState.current);
  }
});

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Navigate: ({ to }: { to: string }) => <div>redirect:{to}</div>,
  useNavigate: () => navigate,
  useSearch: () => searchState.current,
}));

vi.mock('@/hooks/queries/profile.hook', () => ({ useProfile: vi.fn() }));
vi.mock('@/hooks/queries/statistics.hook', () => ({
  useStatisticsDashboard: vi.fn(),
}));

vi.mock('@/components/layout/auth/layout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/statistics/ExportRequetesButton', () => ({
  ExportRequetesButton: () => null,
}));

vi.mock('@/components/queryStateHandler/queryStateHandler', () => ({
  QueryStateHandler: vi.fn(() => null),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  searchState.current = {};
  vi.mocked(useProfile).mockReturnValue({
    data: { role: { id: 'ENTITY_ADMIN' }, entiteId: 'ent-1' },
    isPending: false,
  } as never);
  vi.mocked(useStatisticsDashboard).mockReturnValue({ isFetching: false } as never);
  mockDashboard(DEFAULT_DASHBOARD);
});

const card = (id: number, tabId: number | null, name: string, filterSlugs: string[] = []) => ({
  id,
  dashcardId: id * 10,
  tabId,
  filterSlugs,
  name,
  description: null,
  display: 'scalar',
  layout: null,
  data: {
    cols: [{ name: 'n', display_name: 'n', base_type: 'type/Integer', semantic_type: null, source: null }],
    rows: [[id]],
  },
});

type Dashboard = { tabs: unknown[]; cards: unknown[] };

const DEFAULT_DASHBOARD: Dashboard = { tabs: [], cards: [card(1, null, 'Total requêtes')] };

function mockDashboard(dashboard: Dashboard) {
  vi.mocked(QueryStateHandler).mockImplementation(
    ({ children }) => (children as (props: { data: unknown }) => React.ReactNode)({ data: dashboard }) as never,
  );
}

const renderDashboard = (dashboard: Dashboard) => {
  mockDashboard(dashboard);
  return render(<RouteComponent />);
};

describe('Statistiques route — filtre Domaine fonctionnel', () => {
  it('displays the domaine filter next to the period filter', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('button', { name: 'Période' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Domaine fonctionnel/ })).toBeInTheDocument();
  });

  it('pushes the selected domaines to the URL as a CSV list', async () => {
    const user = userEvent.setup();
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: /Domaine fonctionnel/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Social' }));

    const [{ search }] = navigate.mock.calls.at(-1) as [{ search: (prev: object) => object }];
    expect(search({ period: 'current-year' })).toEqual({ period: 'current-year', domaineIds: 'SOCIAL' });
  });

  it('drops the filter from the URL when the last box is unchecked', async () => {
    const user = userEvent.setup();
    searchState.current = { domaineIds: 'SOCIAL' };
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: /Domaine fonctionnel/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Social' }));

    const [{ search }] = navigate.mock.calls.at(-1) as [{ search: (prev: object) => object }];
    expect(search({ domaineIds: 'SOCIAL' })).toEqual({ domaineIds: undefined });
  });

  it('combines the period and the domaines when querying the dashboard', () => {
    searchState.current = { startDate: '2026-01-01', endDate: '2026-03-31', domaineIds: 'SOCIAL,SANITAIRE' };

    render(<RouteComponent />);

    expect(useStatisticsDashboard).toHaveBeenLastCalledWith(
      { startDate: '2026-01-01', endDate: '2026-03-31', domaineIds: 'SOCIAL,SANITAIRE', includeEIG: undefined },
      true,
    );
  });

  it('names what the page actually filters, at both grouping levels', async () => {
    const user = userEvent.setup();
    render(<RouteComponent />);

    expect(screen.getByRole('group', { name: 'Filtrer les indicateurs' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Domaine fonctionnel/ }));

    expect(screen.getByRole('group', { name: /Filtrer les indicateurs par domaine fonctionnel/ })).toBeInTheDocument();
    expect(screen.queryByText(/Filtrer les requêtes par domaine fonctionnel/)).not.toBeInTheDocument();
  });
});

describe('Statistiques route — filtre EIG', () => {
  it('includes the EIG requêtes by default', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('checkbox', { name: 'Inclure les EIG' })).toBeChecked();
  });

  it('records the exclusion in the search params when the box is unchecked, keeping the other filters', async () => {
    const user = userEvent.setup();
    searchState.current = { domaineIds: 'SOCIAL' };
    render(<RouteComponent />);

    await user.click(screen.getByRole('checkbox', { name: 'Inclure les EIG' }));

    expect(searchState.current).toEqual({ domaineIds: 'SOCIAL', includeEIG: false });
  });

  it('clears includeEIG from the search params when the checkbox is checked back', async () => {
    const user = userEvent.setup();
    searchState.current = { includeEIG: false };
    render(<RouteComponent />);

    expect(screen.getByRole('checkbox', { name: 'Inclure les EIG' })).not.toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Inclure les EIG' }));

    expect(searchState.current).toEqual({ includeEIG: undefined });
  });

  it('passes the exclusion to the dashboard query alongside the other filters', () => {
    searchState.current = { domaineIds: 'SOCIAL', includeEIG: false };

    render(<RouteComponent />);

    expect(useStatisticsDashboard).toHaveBeenLastCalledWith(
      expect.objectContaining({ domaineIds: 'SOCIAL', includeEIG: false }),
      true,
    );
  });
});

describe('Statistiques route — filtres actifs', () => {
  it('shows the active period as a tag below the filter buttons', () => {
    searchState.current = { period: 'rolling-month' };

    render(<RouteComponent />);

    expect(screen.getByRole('button', { name: /^Requêtes créées : Mois glissant/ })).toBeInTheDocument();
  });

  it('phrases a custom range tag around the request creation date', () => {
    searchState.current = { startDate: '2026-01-01', endDate: '2026-01-31' };

    render(<RouteComponent />);

    expect(
      screen.getByRole('button', { name: /^Requêtes créées entre le 01\/01\/2026 et le 31\/01\/2026/ }),
    ).toBeInTheDocument();
  });

  it('clears the period when the tag is dismissed', async () => {
    const user = userEvent.setup();
    searchState.current = { period: 'rolling-month' };
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: /^Requêtes créées : Mois glissant/ }));

    const [{ search }] = navigate.mock.calls.at(-1) as [{ search: (prev: object) => object }];
    expect(search({ period: 'rolling-month', domaineIds: 'SOCIAL' })).toEqual({
      period: undefined,
      startDate: undefined,
      endDate: undefined,
      domaineIds: 'SOCIAL',
    });
  });

  it('shows no tag when no period is selected', () => {
    render(<RouteComponent />);

    expect(screen.queryByRole('button', { name: /^Requêtes créées/ })).not.toBeInTheDocument();
  });
});

describe('Statistiques route — onglets Metabase', () => {
  const tabs = [
    { id: 11, name: 'Volumes', position: 0 },
    { id: 12, name: 'Délais', position: 1 },
  ];
  const cards = [card(1, 11, 'Total requêtes'), card(2, 12, 'Délai moyen')];

  it('renders no tab list when the dashboard has no tabs', () => {
    renderDashboard({ tabs: [], cards: [card(1, null, 'Total requêtes')] });

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('Total requêtes')).toBeInTheDocument();
  });

  it('renders no tab list when the dashboard has a single tab', () => {
    renderDashboard({ tabs: [tabs[0]], cards: [card(1, 11, 'Total requêtes'), card(2, null, 'Orpheline')] });

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('Total requêtes')).toBeInTheDocument();
    expect(screen.getByText('Orpheline')).toBeInTheDocument();
  });

  it('renders one DSFR tab per Metabase tab and shows the first one by default', () => {
    renderDashboard({ tabs, cards });

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Volumes', 'Délais']);
    expect(screen.getByRole('tab', { name: 'Volumes' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Total requêtes')).toBeInTheDocument();
    expect(screen.queryByText('Délai moyen')).not.toBeInTheDocument();
  });

  it('shows the tab requested in the URL', () => {
    searchState.current = { tab: 12 };
    renderDashboard({ tabs, cards });

    expect(screen.getByRole('tab', { name: 'Délais' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Délai moyen')).toBeInTheDocument();
    expect(screen.queryByText('Total requêtes')).not.toBeInTheDocument();
  });

  it('falls back to the first tab when the URL points to an unknown tab', () => {
    searchState.current = { tab: 99 };
    renderDashboard({ tabs, cards });

    expect(screen.getByRole('tab', { name: 'Volumes' })).toHaveAttribute('aria-selected', 'true');
  });

  it('pushes the selected tab to the URL, keeping the other filters', async () => {
    const user = userEvent.setup();
    searchState.current = { domaineIds: 'SOCIAL' };
    renderDashboard({ tabs, cards });

    await user.click(screen.getByRole('tab', { name: 'Délais' }));

    expect(searchState.current).toEqual({ domaineIds: 'SOCIAL', tab: 12 });
  });

  it('keeps the tabs but says so when the selected tab has no card', () => {
    searchState.current = { tab: 12 };
    renderDashboard({ tabs, cards: [card(1, 11, 'Total requêtes')] });

    expect(screen.getByRole('tab', { name: 'Délais' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Aucune carte dans cet onglet.')).toBeInTheDocument();
  });
});

describe('Statistiques route — filtres par onglet', () => {
  const tabs = [
    { id: 11, name: 'Volumes', position: 0 },
    { id: 12, name: 'Délais', position: 1 },
  ];
  const cards = [
    card(1, 11, 'Total requêtes', ['start_date', 'end_date', 'domaine_fonctionnel', 'inclure_eig', 'lieu_de_survenue']),
    card(2, 12, 'Délai moyen', ['start_date', 'end_date']),
    card(3, 12, 'Délai médian', ['domaine_fonctionnel']),
  ];

  it('renders the filters inside the selected tab panel, below the tab list', () => {
    renderDashboard({ tabs, cards });

    const panel = screen.getByRole('tabpanel');
    expect(panel).toContainElement(screen.getByRole('group', { name: 'Filtrer les indicateurs' }));
    expect(panel).toContainElement(screen.getByText('Total requêtes'));
  });

  it('only offers the filters used by the cards of the current tab', () => {
    searchState.current = { tab: 12 };
    renderDashboard({ tabs, cards });

    expect(screen.getByRole('button', { name: 'Période' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Domaine fonctionnel/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /lieu de survenue/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Inclure les EIG' })).not.toBeInTheDocument();
  });

  it('offers every filter on a tab whose cards use them all', () => {
    searchState.current = { tab: 11 };
    renderDashboard({ tabs, cards });

    expect(screen.getByRole('button', { name: 'Période' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Domaine fonctionnel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lieu de survenue/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Inclure les EIG' })).toBeInTheDocument();
  });

  it('hides the active period tag on a tab that does not use the period filter', () => {
    searchState.current = { tab: 12, period: 'rolling-month' };
    renderDashboard({
      tabs,
      cards: [card(1, 11, 'Total requêtes', ['start_date']), card(3, 12, 'Délai médian', ['domaine_fonctionnel'])],
    });

    expect(screen.queryByRole('button', { name: /^Requêtes créées/ })).not.toBeInTheDocument();
  });

  it('renders no filter block when no card of the tab uses any filter', () => {
    searchState.current = { tab: 12 };
    renderDashboard({ tabs, cards: [card(1, 11, 'Total requêtes', ['start_date']), card(3, 12, 'Texte libre')] });

    expect(screen.queryByRole('group', { name: 'Filtrer les indicateurs' })).not.toBeInTheDocument();
    expect(screen.getByText('Texte libre')).toBeInTheDocument();
  });

  it('keeps every filter when the dashboard declares no mapping at all', () => {
    renderDashboard({ tabs, cards: [card(1, 11, 'Total requêtes'), card(2, 12, 'Délai moyen')] });

    expect(screen.getByRole('button', { name: 'Période' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Inclure les EIG' })).toBeInTheDocument();
  });
});
