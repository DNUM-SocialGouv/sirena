import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDirectionServiceAdminLocal } from '@/hooks/queries/entites.hook';
import { RouteComponent } from './$entiteId.edit';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: 'dir-autonomie' }),
  }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  redirect: vi.fn(),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useDirectionServiceAdminLocal: vi.fn(),
}));

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchResolvedFeatureFlags: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { ensureQueryData: vi.fn() },
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => vi.fn()),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

it('renders a prefilled local Direction form without contact-usager fields', () => {
  vi.mocked(useDirectionServiceAdminLocal).mockReturnValue({
    data: {
      id: 'dir-autonomie',
      kind: 'direction',
      nomComplet: 'Direction Autonomie',
      label: 'DA',
      email: 'direction-autonomie@ars.fr',
      isActive: false,
    },
    isPending: false,
    isError: false,
  } as never);

  render(<RouteComponent />);

  expect(
    screen.getByRole('heading', { level: 2, name: 'Modifier la direction Direction Autonomie' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Nom de la direction/ })).toHaveValue('Direction Autonomie');
  expect(screen.getByRole('textbox', { name: /Abréviation/ })).toHaveValue('DA');
  expect(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ })).toHaveValue(
    'direction-autonomie@ars.fr',
  );
  expect(screen.getByRole('combobox', { name: /Actif dans SIRENA/ })).toHaveValue('non');
  expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/admin/directions-services');
  expect(screen.queryByText(/contact pour l’usager/i)).not.toBeInTheDocument();
  expect(document.title).toBe('Modifier la direction Direction Autonomie - Directions et services - SIRENA');
});
