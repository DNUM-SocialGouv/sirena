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

vi.mock('./-create-route-guard', () => ({
  requireAdminLocalServiceCreation: serviceCreationGuardSpy,
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
      serviceParentDirection: {
        id: 'dir-autonomie',
        nomComplet: 'Direction Autonomie',
        label: 'DA',
      },
    },
  } as never);
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

  it('renders the validated Service form with its assigned Direction first and read-only', () => {
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        data: [],
        capabilities: {
          canCreateDirection: false,
          canCreateService: true,
        },
        availableDirections: [],
        serviceParentDirection: {
          id: 'dir-autonomie',
          nomComplet: 'Direction Autonomie',
          label: 'DA',
        },
      },
    } as never);

    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Ajouter un service' })).toBeInTheDocument();
    expect(screen.getByText('Informations utilisées dans SIRENA')).toBeVisible();
    const direction = screen.getByRole('textbox', { name: /Direction \(obligatoire\)/ });
    const serviceName = screen.getByRole('textbox', { name: /Nom du service \(obligatoire\)/ });
    expect(direction).toHaveValue('Direction Autonomie (DA)');
    expect(direction).toHaveAttribute('readonly');
    expect(screen.getByText('Organisation à laquelle le service est rattaché')).toBeVisible();
    expect(direction.compareDocumentPosition(serviceName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Nom complet sans abréviation ou acronyme.*Professions Médicales/)).toBeVisible();
    expect(screen.getByText(/Sigle, acronyme ou forme abrégée du nom.*PM/)).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ })).toBeInTheDocument();
    expect(screen.getByText('Informations de contact pour l’usager')).toBeVisible();
    expect(screen.getByText(/l’adresse e-mail de notification sera transmise au déclarant/)).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Numéro de téléphone/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Adresse postale/ })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Actif dans SIRENA/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter le service' })).toBeInTheDocument();
    expect(document.title).toBe('Ajouter un service - Directions et services - SIRENA');
  });

  it('submits every visible contact value without an activation field and returns to the refreshed list', async () => {
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
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ }), 'contact@ars.fr');
    await user.type(screen.getByRole('textbox', { name: /Numéro de téléphone/ }), '0102030405');
    await user.type(screen.getByRole('textbox', { name: /Adresse postale/ }), '1 rue de la Santé, Paris');
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      nomComplet: 'Service Autonomie',
      label: 'SA',
      email: 'service-autonomie@ars.fr',
      emailContactUsager: 'contact@ars.fr',
      telContactUsager: '0102030405',
      adresseContactUsager: '1 rue de la Santé, Paris',
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
    await user.selectOptions(screen.getByRole('combobox', { name: /Direction \(obligatoire\)/ }), 'dir-autonomie');
    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      nomComplet: 'Service Autonomie',
      label: 'SA',
      email: '',
      emailContactUsager: '',
      telContactUsager: '',
      adresseContactUsager: '',
      directionId: 'dir-autonomie',
    });
  });

  it('focuses the first invalid visible field when required fields and Direction are missing', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('button', { name: 'Ajouter le service' }));

    const directionSelect = screen.getByRole('combobox', { name: /Direction \(obligatoire\)/ });
    expect(directionSelect).toHaveFocus();
    expect(directionSelect).toHaveAccessibleDescription(
      'Veuillez sélectionner la direction à laquelle rattacher le service.',
    );
    expect(screen.getByText('Le champ "Nom du service" est vide. Veuillez le renseigner.')).toBeInTheDocument();
    expect(screen.getByText('Le champ "Abréviation" est vide. Veuillez le renseigner.')).toBeInTheDocument();
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

    const directionSelect = screen.getByRole('combobox', {
      name: /Direction \(obligatoire\)/,
    });
    expect(directionSelect).toHaveAccessibleDescription(
      'Veuillez sélectionner la direction à laquelle rattacher le service.',
    );
    expect(directionSelect).toHaveFocus();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects invalid contact-usager e-mail and telephone values', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn();
    vi.mocked(useCreateServiceAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<RouteComponent />);

    await user.type(screen.getByRole('textbox', { name: /Nom du service/ }), 'Service Autonomie');
    await user.type(screen.getByRole('textbox', { name: /Abréviation/ }), 'SA');
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
