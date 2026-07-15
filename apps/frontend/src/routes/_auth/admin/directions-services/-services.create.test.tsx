import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateServiceAdminLocal, useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { RouteComponent } from './services.create';

const { addToastSpy, routerNavigateSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useRouter: () => ({ navigate: routerNavigateSpy }),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useCreateServiceAdminLocal: vi.fn(),
  useDirectionsServicesList: vi.fn(),
}));

vi.mock('./-route-guard', () => ({
  requireAdminLocalDirectionsServices: vi.fn(),
}));

vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');

  return {
    ...actual,
    Toast: {
      useToastManager: () => ({ add: addToastSpy }),
    },
  };
});

beforeEach(() => {
  vi.mocked(useCreateServiceAdminLocal).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'service-autonomie' }),
    isPending: false,
  } as never);
  vi.mocked(useDirectionsServicesList).mockReturnValue({
    data: {
      data: [],
      capabilities: {
        canCreateDirection: false,
        canCreateService: true,
      },
      availableDirections: [],
    },
  } as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Service create route', () => {
  it('renders Service-specific visible fields without contact-usager fields', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Créer un service' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Nom du service \(obligatoire\)/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Abréviation \(obligatoire\)/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Actif dans SIRENA/ })).toHaveValue('oui');
    expect(screen.queryByRole('textbox', { name: /Adresse e-mail de contact/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Numéro de téléphone/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /Adresse postale/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/transmise au déclarant/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter le service' })).toBeInTheDocument();
  });

  it('creates an inactive Service and returns to the refreshed local list', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'service-autonomie' });
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<RouteComponent />);

    await user.type(screen.getByRole('textbox', { name: /Nom du service/ }), 'Service Autonomie');
    await user.type(screen.getByRole('textbox', { name: /Abréviation/ }), 'SA');
    await user.type(
      screen.getByRole('textbox', { name: /Adresse e-mail de notification/ }),
      'service-autonomie@ars.fr',
    );
    await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/ }), 'non');
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      nomComplet: 'Service Autonomie',
      label: 'SA',
      email: 'service-autonomie@ars.fr',
      isActive: false,
    });
    await waitFor(() => {
      expect(addToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Service créé avec succès' }));
      expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/directions-services' });
    });
  });

  it('creates a Service beneath the available Direction selected by a root-level Admin', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'service-autonomie' });
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: true,
        },
        availableDirections: [
          { id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' },
          { id: 'dir-enfance', nomComplet: 'Direction Enfance', label: 'DE' },
        ],
      },
    } as never);
    render(<RouteComponent />);

    await user.type(screen.getByRole('textbox', { name: /Nom du service/ }), 'Service Autonomie');
    await user.type(screen.getByRole('textbox', { name: /Abréviation/ }), 'SA');
    await user.selectOptions(screen.getByRole('combobox', { name: /Direction de rattachement/ }), 'dir-autonomie');
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      nomComplet: 'Service Autonomie',
      label: 'SA',
      email: '',
      isActive: true,
      directionId: 'dir-autonomie',
    });
  });

  it('requires a Direction selection for a root-level Admin', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn();
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: true,
          canCreateService: true,
        },
        availableDirections: [{ id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' }],
      },
    } as never);
    render(<RouteComponent />);

    await user.type(screen.getByRole('textbox', { name: /Nom du service/ }), 'Service Autonomie');
    await user.type(screen.getByRole('textbox', { name: /Abréviation/ }), 'SA');
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    expect(screen.getByText(/La Direction de rattachement est obligatoire/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Direction de rattachement/ })).toHaveFocus();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows an error and stays on the form when Service creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Creation failed')),
      isPending: false,
    } as never);
    render(<RouteComponent />);

    await user.type(screen.getByRole('textbox', { name: /Nom du service/ }), 'Service Autonomie');
    await user.type(screen.getByRole('textbox', { name: /Abréviation/ }), 'SA');
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    await waitFor(() => {
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Erreur lors de la création du service. Veuillez réessayer.',
        timeout: 0,
        data: { icon: 'fr-alert--error' },
      });
    });
    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });
});
