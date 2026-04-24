import { ROLES } from '@sirena/common/constants';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { Route, RouteComponent } from './$entiteId.index';

const { addToastSpy, editEntiteAdminMutateAsyncSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  editEntiteAdminMutateAsyncSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: 'root-ars' }),
  }),
  Link: ({ to, params, children }: { to: string; params?: { entiteId?: string }; children: React.ReactNode }) => (
    <a href={to.replace('$entiteId', params?.entiteId ?? '')}>{children}</a>
  ),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteByIdAdmin: vi.fn(),
  useEntiteChain: vi.fn(),
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

const buildChainSuccessQuery = (data: Array<{ id: string; nomComplet: string; disabled: boolean }>) =>
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
});

describe('Admin entity edit route', () => {
  it('restricts the route to SUPER_ADMIN users', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.SUPER_ADMIN]);
    expect(Route.beforeLoad).toBe('mocked-super-admin-guard');
  });

  it('renders the limited edit form from the admin entity payload', () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(mockedUseEntiteByIdAdmin).toHaveBeenCalledWith('root-ars');
    expect(screen.getByRole('heading', { level: 2, name: 'Modifier une entité' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /liste des entités/i })).toHaveAttribute('href', '/admin/entites');

    expect(screen.getByLabelText(/Nom de l'entité/i)).toHaveValue('ARS Normandie');
    expect(screen.getByLabelText(/Libellé de l'entité/i)).toHaveValue('ARS NOR');
    expect(screen.getByRole('combobox', { name: /Actif dans SIRENA/i })).toHaveValue('oui');
    expect(screen.getByRole('option', { name: 'Sélectionnez une option' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Oui' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Non' })).toBeInTheDocument();
  });

  it('shows a "Créer une direction" action on a root entity edit page', () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('link', { name: /créer une direction/i })).toHaveAttribute(
      'href',
      '/admin/entites/root-ars/create',
    );
  });

  it('keeps the edit form actions limited to cancel and submit', () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    const submitButton = screen.getByRole('button', { name: /valider les modifications/i });
    const form = submitButton.closest('form');

    expect(form).not.toBeNull();
    expect(within(form as HTMLFormElement).getByRole('link', { name: /annuler/i })).toHaveAttribute(
      'href',
      '/admin/entites',
    );
    expect(within(form as HTMLFormElement).getByRole('button', { name: /valider les modifications/i })).toBe(
      submitButton,
    );
    expect(
      within(form as HTMLFormElement).queryByRole('link', { name: /créer une direction/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a "Créer un service" action when the entity chain depth is 2', () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([
        { id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false },
        { id: 'dir-1', nomComplet: 'Direction de la prévention', disabled: false },
      ]),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('link', { name: /créer un service/i })).toHaveAttribute(
      'href',
      '/admin/entites/root-ars/create',
    );
  });

  it('does not show any child creation action on a service edit page', () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'service-1',
        nomComplet: 'Service territorial',
        label: 'SVC TER',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([
        { id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false },
        { id: 'dir-1', nomComplet: 'Direction de la prévention', disabled: false },
        { id: 'service-1', nomComplet: 'Service territorial', disabled: false },
      ]),
    );

    render(<RouteComponent />);

    expect(screen.queryByRole('link', { name: /créer une direction/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /créer un service/i })).not.toBeInTheDocument();
  });

  it('shows zod validation errors', async () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    const submitButton = screen.getByRole('button', { name: /valider les modifications/i });
    const form = submitButton.closest('form');
    expect(form).toHaveAttribute('novalidate');
    expect(screen.getByRole('combobox', { name: /Actif dans SIRENA/i })).not.toHaveAttribute('required');

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Nom de l'entité/i));
    await user.clear(screen.getByLabelText(/Libellé de l'entité/i));
    fireEvent.change(screen.getByRole('combobox', { name: /Actif dans SIRENA/i }), { target: { value: '' } });
    await user.click(submitButton);

    expect(await screen.findByText('Le nom est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Le libellé est obligatoire.')).toBeInTheDocument();
    expect(screen.getByText('Le statut actif dans SIRENA est obligatoire.')).toBeInTheDocument();
    expect(editEntiteAdminMutateAsyncSpy).not.toHaveBeenCalled();
  });

  it('submits the limited editable fields to the admin edit mutation', async () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );
    editEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'root-ars',
      nomComplet: 'ARS Bretagne',
      label: 'ARS BRE',
      isActive: false,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/Nom de l'entité/i));
    await user.type(screen.getByLabelText(/Nom de l'entité/i), 'ARS Bretagne');
    await user.clear(screen.getByLabelText(/Libellé de l'entité/i));
    await user.type(screen.getByLabelText(/Libellé de l'entité/i), 'ARS BRE');
    await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/i }), 'non');
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
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );
    editEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'root-ars',
      nomComplet: 'ARS Bretagne',
      label: 'ARS BRE',
      isActive: false,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/Nom de l'entité/i));
    await user.type(screen.getByLabelText(/Nom de l'entité/i), 'ARS Bretagne');
    await user.click(screen.getByRole('button', { name: /valider les modifications/i }));

    await waitFor(() => {
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Entité modifiée avec succès',
        description: 'Les modifications ont bien été enregistrées.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    });
  });

  it('falls back to the entities list when browser history is unavailable', async () => {
    const mockedUseEntiteByIdAdmin = vi.mocked(useEntiteByIdAdmin);
    const mockedUseEntiteChain = vi.mocked(useEntiteChain);

    mockedUseEntiteByIdAdmin.mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    mockedUseEntiteChain.mockReturnValue(
      buildChainSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
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
  });
});
