import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { useDirectionServiceAdminLocal } from '@/hooks/queries/entites.hook';
import { RouteComponent } from './$entiteId.edit';

const { addToastSpy, editMutateAsyncSpy, routerNavigateSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  editMutateAsyncSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: 'dir-autonomie' }),
  }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  redirect: vi.fn(),
  useRouter: () => ({ navigate: routerNavigateSpy }),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useDirectionServiceAdminLocal: vi.fn(),
  useEditDirectionServiceAdminLocal: () => ({
    mutateAsync: editMutateAsyncSpy,
    isPending: false,
  }),
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

vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return {
    ...actual,
    Toast: { useToastManager: () => ({ add: addToastSpy }) },
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
  editMutateAsyncSpy.mockReset();
  routerNavigateSpy.mockReset();
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

it('validates and saves only visible local fields before returning to the list', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockResolvedValueOnce({ id: 'dir-autonomie' });
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

  const nameInput = screen.getByRole('textbox', { name: /Nom de la direction/ });
  await user.clear(nameInput);
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  expect(editMutateAsyncSpy).not.toHaveBeenCalled();
  expect(nameInput).toHaveFocus();
  expect(nameInput).toHaveAccessibleDescription('Le champ "Nom de la direction" est vide. Veuillez le renseigner.');

  await user.type(nameInput, 'Direction Autonomie et Handicap');
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() => {
    expect(editMutateAsyncSpy).toHaveBeenCalledWith({
      id: 'dir-autonomie',
      input: {
        nomComplet: 'Direction Autonomie et Handicap',
        label: 'DA',
        email: 'direction-autonomie@ars.fr',
        isActive: false,
      },
    });
  });
  expect(addToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Direction modifiée avec succès' }));
  expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/directions-services' });
});

it('renders a local Service edit form without contact-usager fields', () => {
  vi.mocked(useDirectionServiceAdminLocal).mockReturnValue({
    data: {
      id: 'service-pa',
      kind: 'service',
      nomComplet: 'Service PA',
      label: 'PA',
      email: 'service-pa@ars.fr',
      isActive: true,
    },
    isPending: false,
    isError: false,
  } as never);

  render(<RouteComponent />);

  expect(screen.getByRole('heading', { level: 2, name: 'Modifier le service Service PA' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Nom du service \(obligatoire\)/ })).toHaveValue('Service PA');
  expect(screen.queryByText(/contact pour l’usager/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Adresse e-mail de contact/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Numéro de téléphone/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Adresse postale/ })).not.toBeInTheDocument();
  expect(document.title).toBe('Modifier le service Service PA - Directions et services - SIRENA');
});

it('shows an error and stays on the edit form when saving fails', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockRejectedValueOnce(new Error('Request failed'));
  vi.mocked(useDirectionServiceAdminLocal).mockReturnValue({
    data: {
      id: 'service-pa',
      kind: 'service',
      nomComplet: 'Service PA',
      label: 'PA',
      email: 'service-pa@ars.fr',
      isActive: true,
    },
    isPending: false,
    isError: false,
  } as never);

  render(<RouteComponent />);
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() => {
    expect(addToastSpy).toHaveBeenCalledWith({
      title: 'Erreur',
      description: 'Erreur lors de la modification du service. Veuillez réessayer.',
      timeout: 0,
      data: { icon: 'fr-alert--error' },
    });
  });
  expect(routerNavigateSpy).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Modifier le service Service PA' })).toBeInTheDocument();
});
