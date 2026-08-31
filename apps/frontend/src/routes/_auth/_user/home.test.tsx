import { useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouteComponent } from './home';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/request/create">{children}</a>,
}));

vi.mock('@/components/common/tables/requetesEntites.tsx', () => ({
  RequetesEntite: () => <div>Liste des requêtes</div>,
}));

vi.mock('@/components/home/HomeAnnouncementModal', () => ({
  HomeAnnouncementModal: () => <div>Annonce active</div>,
}));

vi.mock('@/components/queryStateHandler/queryStateHandler', () => ({
  QueryStateHandler: ({ children }: { children: () => React.ReactNode }) => <>{children()}</>,
}));

vi.mock('@/hooks/queries/profile.hook', () => ({
  profileQueryOptions: () => ({}),
}));

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: false }),
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(),
}));

vi.mock('@/lib/router', () => ({
  router: { navigate: vi.fn() },
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({ role: 'READER' }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('Home route', () => {
  it('mounts the active announcement in the business home experience', () => {
    vi.mocked(useQuery).mockReturnValue({
      data: { prenom: 'Camille', statutId: 'ACTIF' },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('heading', { name: 'Tableau de bord des requêtes' })).toBeInTheDocument();
    expect(screen.getByText('Annonce active')).toBeInTheDocument();
  });
});
