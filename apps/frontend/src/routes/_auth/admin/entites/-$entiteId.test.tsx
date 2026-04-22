import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntiteByIdAdmin } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { Route, RouteComponent } from './$entiteId';

const { addToastSpy, editEntiteAdminMutateAsyncSpy, routerBackSpy, routerNavigateSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  editEntiteAdminMutateAsyncSpy: vi.fn(),
  routerBackSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: 'root-ars' }),
  }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useRouter: () => ({
    history: { back: routerBackSpy },
    navigate: routerNavigateSpy,
  }),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteByIdAdmin: vi.fn(),
  useEditEntiteAdmin: () => ({
    mutateAsync: editEntiteAdminMutateAsyncSpy,
    isPending: false,
  }),
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => 'mocked-super-admin-guard'),
}));

vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');

  return {
    ...actual,
    Toast: {
      useToastManager: () => ({
        add: addToastSpy,
      }),
    },
  };
});

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
  editEntiteAdminMutateAsyncSpy.mockReset();
  routerBackSpy.mockReset();
  routerNavigateSpy.mockReset();
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

  it('submits the limited editable fields to the admin edit mutation', async () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    editEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'root-ars',
      nomComplet: 'ARS Bretagne',
      label: 'ARS BRE',
      isActive: false,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/Nom \(libellé long\)/i));
    await user.type(screen.getByLabelText(/Nom \(libellé long\)/i), 'ARS Bretagne');
    await user.clear(screen.getByLabelText(/Nom court/i));
    await user.type(screen.getByLabelText(/Nom court/i), 'ARS BRE');
    await user.click(screen.getByRole('radio', { name: 'Non' }));
    await user.click(screen.getByRole('button', { name: /valider les modifications/i }));

    await waitFor(() => {
      expect(editEntiteAdminMutateAsyncSpy).toHaveBeenCalledWith({
        id: 'root-ars',
        input: {
          nomComplet: 'ARS Bretagne',
          label: 'ARS BRE',
          isActive: false,
        },
      });
    });
  });

  it('shows a success toast after saving the entity', async () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    editEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'root-ars',
      nomComplet: 'ARS Bretagne',
      label: 'ARS BRE',
      isActive: false,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/Nom \(libellé long\)/i));
    await user.type(screen.getByLabelText(/Nom \(libellé long\)/i), 'ARS Bretagne');
    await user.click(screen.getByRole('button', { name: /valider les modifications/i }));

    await waitFor(() => {
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Entité modifiée',
        description: 'Les modifications ont été enregistrées avec succès.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    });
  });

  it('navigates back after saving the entity successfully', async () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    editEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'root-ars',
      nomComplet: 'ARS Bretagne',
      label: 'ARS BRE',
      isActive: false,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /valider les modifications/i }));

    await waitFor(() => {
      expect(routerBackSpy).toHaveBeenCalled();
    });
  });
});
