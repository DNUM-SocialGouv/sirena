import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useResolvedFeatureFlags } from '@/hooks/queries/featureFlags.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useStatisticsDashboard } from '@/hooks/queries/statistics.hook';
import { RouteComponent } from './statistiques';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  createFileRoute: () => () => ({}),
  Navigate: () => null,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

vi.mock('@/hooks/queries/featureFlags.hook', () => ({ useResolvedFeatureFlags: vi.fn() }));
vi.mock('@/hooks/queries/profile.hook', () => ({ useProfile: vi.fn() }));
vi.mock('@/hooks/queries/statistics.hook', () => ({ useStatisticsDashboard: vi.fn() }));
vi.mock('@/components/statistics/PeriodFilter', () => ({ PeriodFilter: () => null }));
vi.mock('@/components/statistics/ExportRequetesButton', () => ({
  ExportRequetesButton: () => <button type="button">Exporter les requêtes</button>,
}));
vi.mock('@/components/queryStateHandler/queryStateHandler', () => ({
  QueryStateHandler: ({ query }: { query: { isError: boolean } }) =>
    query.isError ? <p>Les indicateurs sont indisponibles.</p> : null,
}));

const mockedUseResolvedFeatureFlags = vi.mocked(useResolvedFeatureFlags);
const mockedUseProfile = vi.mocked(useProfile);
const mockedUseStatisticsDashboard = vi.mocked(useStatisticsDashboard);

describe('statistics route', () => {
  beforeEach(() => {
    mockedUseResolvedFeatureFlags.mockReturnValue({
      status: 'success',
      data: { STATISTICS: true },
    } as never);
    mockedUseProfile.mockReturnValue({
      data: { entiteId: 'root-entite' },
      isPending: false,
    } as never);
    mockedUseStatisticsDashboard.mockReturnValue({
      isError: true,
      isFetching: false,
      isSuccess: false,
    } as never);
  });

  it('keeps the export action available when dashboard loading fails', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('button', { name: 'Exporter les requêtes' })).toBeInTheDocument();
    expect(screen.getByText('Les indicateurs sont indisponibles.')).toBeInTheDocument();
  });
});
