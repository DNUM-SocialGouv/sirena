import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateServiceAdminLocal, useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { Route, RouteComponent } from './services.create';

const { addToastSpy, routerNavigateSpy, serviceCreationGuardSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
  serviceCreationGuardSpy: vi.fn(),
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
vi.mock('./-create-route-guard', () => ({ requireAdminLocalServiceCreation: serviceCreationGuardSpy }));
vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return { ...actual, Toast: { useToastManager: () => ({ add: addToastSpy }) } };
});

const parentDirection = { id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' };

function mockDirectionsList(
  data: {
    capabilities?: { canCreateDirection: boolean; canCreateService: boolean };
    availableDirections?: (typeof parentDirection)[];
    serviceParentDirection?: typeof parentDirection;
  } = {},
) {
  vi.mocked(useDirectionsServicesList).mockReturnValue({
    data: {
      data: [],
      capabilities: data.capabilities ?? { canCreateDirection: false, canCreateService: true },
      availableDirections: data.availableDirections ?? [],
      serviceParentDirection: data.serviceParentDirection ?? parentDirection,
    },
  } as never);
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /Nom du service/ }), 'Service Autonomie');
  await user.type(screen.getByRole('textbox', { name: /Abréviation/ }), 'SA');
}

beforeEach(() => {
  vi.mocked(useCreateServiceAdminLocal).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'service-autonomie' }),
    isPending: false,
  } as never);
  mockDirectionsList();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Service create route', () => {
  it('uses the Service creation capability guard', () => {
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBe(serviceCreationGuardSpy);
  });

  it('renders the Service form with its assigned Direction first and read-only', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('heading', { name: 'Ajouter un service' })).toBeInTheDocument();
    const direction = screen.getByRole('textbox', { name: /Direction \(obligatoire\)/ });
    const serviceName = screen.getByRole('textbox', { name: /Nom du service \(obligatoire\)/ });
    expect(direction).toHaveValue('Direction Autonomie (DA)');
    expect(direction).toHaveAttribute('readonly');
    expect(direction.compareDocumentPosition(serviceName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Nom complet sans abréviation ou acronyme.*Professions Médicales/)).toBeVisible();
    expect(screen.getByRole('group', { name: 'Informations de contact pour l’usager' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Actif dans SIRENA/ })).not.toBeInTheDocument();
    expect(document.title).toBe('Ajouter un service - Directions et services - SIRENA');
  });

  it('submits visible values under the assigned Direction and returns to the list', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'service-autonomie' });
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<RouteComponent />);

    await fillRequiredFields(user);
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ }), 'service@ars.fr');
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ }), 'contact@ars.fr');
    await user.type(screen.getByRole('textbox', { name: /Numéro de téléphone/ }), '0102030405');
    await user.type(screen.getByRole('textbox', { name: /Adresse postale/ }), '1 rue de la Santé, Paris');
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        nomComplet: 'Service Autonomie',
        label: 'SA',
        email: 'service@ars.fr',
        emailContactUsager: 'contact@ars.fr',
        telContactUsager: '0102030405',
        adresseContactUsager: '1 rue de la Santé, Paris',
      });
      expect(addToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Service créé avec succès' }));
      expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/directions-services' });
    });
  });

  it('requires and submits a selected Direction for a root-level Admin', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn();
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    mockDirectionsList({
      capabilities: { canCreateDirection: true, canCreateService: true },
      availableDirections: [parentDirection, { id: 'dir-enfance', nomComplet: 'Direction Enfance', label: 'DE' }],
      serviceParentDirection: undefined,
    });
    render(<RouteComponent />);
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));
    const select = screen.getByRole('combobox', { name: /Direction \(obligatoire\)/ });
    expect(select).toHaveFocus();
    expect(select).toHaveAccessibleDescription('Veuillez sélectionner la direction à laquelle rattacher le service.');
    expect(mutateAsync).not.toHaveBeenCalled();

    await user.selectOptions(select, parentDirection.id);
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      nomComplet: 'Service Autonomie',
      label: 'SA',
      email: '',
      emailContactUsager: '',
      telContactUsager: '',
      adresseContactUsager: '',
      directionId: parentDirection.id,
    });
  });

  it('rejects invalid contact values', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn();
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<RouteComponent />);
    await fillRequiredFields(user);
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ }), 'adresse-invalide');
    await user.type(screen.getByRole('textbox', { name: /Numéro de téléphone/ }), '123');

    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toHaveFocus();
    expect(screen.getByText(/L’adresse e-mail est invalide/)).toBeInTheDocument();
    expect(
      screen.getByText(/Le numéro de téléphone doit être au format national ou international/),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('shows an error and stays on the form when creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Creation failed')),
      isPending: false,
    } as never);
    render(<RouteComponent />);
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    await waitFor(() =>
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Erreur lors de la création du service. Veuillez réessayer.',
        timeout: 0,
        data: { icon: 'fr-alert--error' },
      }),
    );
    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });
});
