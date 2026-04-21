import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntiteByIdAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { Route, RouteComponent } from './$entiteId';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: 'root-ars' }),
  }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteByIdAdmin: vi.fn(),
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => 'mocked-super-admin-guard'),
}));

const buildSuccessQuery = (data: { id: string; nomComplet: string; label: string; isActive: boolean }) =>
  ({
    data,
    isPending: false,
    isError: false,
    error: null,
  }) as never;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Admin entity edit route', () => {
  it('restricts the route to SUPER_ADMIN users', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.SUPER_ADMIN]);
    expect(Route.beforeLoad).toBe('mocked-super-admin-guard');
  });

  it('renders the limited edit form from the admin entity payload', () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );

    render(<RouteComponent />);

    expect(mockedUseEntiteByIdAdmin).toHaveBeenCalledWith('root-ars');
    expect(screen.getByRole('heading', { level: 1, name: 'Éditer une entité' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /liste des entités/i })).toHaveAttribute('href', '/admin/entites');

    expect(screen.getByLabelText(/Nom \(libellé long\)/i)).toHaveValue('ARS Normandie');
    expect(screen.getByLabelText(/Nom court/i)).toHaveValue('ARS NOR');
    expect(screen.getByRole('radio', { name: 'Oui' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Non' })).not.toBeChecked();
  });
});
