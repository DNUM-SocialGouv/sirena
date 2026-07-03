import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import { RouteComponent } from './statistiques';

const navigate = vi.fn();
const searchState = vi.hoisted(() => ({
  current: {} as Record<string, string | undefined>,
}));

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
  QueryStateHandler: () => null,
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
});

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
      { startDate: '2026-01-01', endDate: '2026-03-31', domaineIds: 'SOCIAL,SANITAIRE' },
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
