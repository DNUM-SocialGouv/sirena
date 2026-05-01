import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect as useReactEffect, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { Route, RouteComponent } from './$entiteId.create';

const { addToastSpy, routerNavigateSpy, createChildEntiteAdminMutateAsyncSpy, routeParamsState } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
  createChildEntiteAdminMutateAsyncSpy: vi.fn(),
  routeParamsState: { entiteId: 'root-ars' },
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => routeParamsState,
  }),
  Link: ({ to, params, children }: { to: string; params?: { entiteId?: string }; children: React.ReactNode }) => (
    <a href={to.replace('$entiteId', params?.entiteId ?? '')}>{children}</a>
  ),
  useRouter: () => ({
    navigate: routerNavigateSpy,
  }),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteByIdAdmin: vi.fn(),
  useEntiteChain: vi.fn(),
  useCreateChildEntiteAdmin: () => ({
    mutateAsync: createChildEntiteAdminMutateAsyncSpy,
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

const buildSuccessQuery = (data: unknown) =>
  ({
    data,
    isPending: false,
    isError: false,
    error: null,
  }) as never;

const buildPendingQuery = () =>
  ({
    data: null,
    isPending: true,
    isError: false,
    error: null,
  }) as never;

const buildErrorQuery = () =>
  ({
    data: null,
    isPending: false,
    isError: true,
    error: new Error('Query failed'),
  }) as never;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  createChildEntiteAdminMutateAsyncSpy.mockReset();
  routerNavigateSpy.mockReset();
  routeParamsState.entiteId = 'root-ars';
});

describe('Admin entity child creation route', () => {
  it('restricts the route to SUPER_ADMIN users', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.SUPER_ADMIN]);
    expect(Route.beforeLoad).toBe('mocked-super-admin-guard');
  });

  it('renders the title "Créer une direction" when the parent entity is a root entite', () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Créer une direction' })).toBeInTheDocument();
  });

  it('shows the parent entity in read-only context outside the form', () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByText('Entité mère')).toBeInTheDocument();
    expect(screen.getByText('ARS Normandie')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /entité mère/i })).not.toBeInTheDocument();
  });

  it('renders the title "Créer un service" when the parent entity is a direction', () => {
    routeParamsState.entiteId = 'dir-1';

    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'dir-1',
        nomComplet: 'Direction de la prévention',
        label: 'DIR PREV',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([
        { id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false },
        { id: 'dir-1', nomComplet: 'Direction de la prévention', disabled: false },
      ]),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Créer un service' })).toBeInTheDocument();
  });

  it('redirects to the parent edit page when the parent entity is a service', async () => {
    routeParamsState.entiteId = 'service-1';

    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'service-1',
        nomComplet: 'Service territorial',
        label: 'SVC TER',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([
        { id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false },
        { id: 'dir-1', nomComplet: 'Direction de la prévention', disabled: false },
        { id: 'service-1', nomComplet: 'Service territorial', disabled: false },
      ]),
    );

    render(<RouteComponent />);
  });

  it('displays the shared loader while entity data is loading', () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(buildPendingQuery());
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Créer/i })).not.toBeInTheDocument();
  });

  it('displays the shared error state when entity data cannot be loaded', () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(buildErrorQuery());
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByText('Erreur lors du chargement de l’entité.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Créer/i })).not.toBeInTheDocument();
  });

  it('keeps a stable hook order when the create page leaves its pending state', async () => {
    vi.mocked(useEntiteByIdAdmin).mockImplementation(() => {
      const [query, setQuery] = useState(
        () =>
          ({
            data: null,
            isPending: true,
            isError: false,
            error: null,
          }) as never,
      );

      useReactEffect(() => {
        setQuery(
          buildSuccessQuery({
            id: 'root-ars',
            nomComplet: 'ARS Normandie',
            label: 'ARS NOR',
            isActive: true,
          }),
        );
      }, []);

      return query;
    });

    vi.mocked(useEntiteChain).mockImplementation(() => {
      const [query, setQuery] = useState(
        () =>
          ({
            data: null,
            isPending: true,
            isError: false,
            error: null,
          }) as never,
      );

      useReactEffect(() => {
        setQuery(buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]));
      }, []);

      return query;
    });

    render(<RouteComponent />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Nom - libellé long/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Nom court/i)).toBeInTheDocument();
  });

  it('renders the notification field and hides deprecated technical fields', () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByLabelText(/Adresse électronique de notification/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Boîte e-mail générique pour la notification des nouvelles requêtes\. Exemple : prenom\.nom@exemple\.com/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders the user-facing contact section with semantic grouping and agreed labels', () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    const contactGroup = screen.getByRole('group', { name: /Éléments de contact pour l’usager/i });

    expect(contactGroup).toBeInTheDocument();
    expect(within(contactGroup).getByLabelText(/Adresse électronique/i)).toBeInTheDocument();
    expect(within(contactGroup).getByText(/Exemple : prenom\.nom@exemple\.com/i)).toBeInTheDocument();
    expect(within(contactGroup).getByLabelText(/Adresse postale/i)).toBeInTheDocument();
    expect(
      within(contactGroup).getByText(
        /Adresse postale complète pour l’usager : service, numéro et libellé de voie, code postal, ville\./i,
      ),
    ).toBeInTheDocument();
    expect(
      within(contactGroup).getByText(/Sous-direction de l’autonomie, Direction des Solidarités \(DSOL\), 5 bd/i),
    ).toBeInTheDocument();
    expect(within(contactGroup).getByLabelText(/Numéro de téléphone/i)).toBeInTheDocument();
  });

  it('renders the active status choice with a required placeholder and Oui / Non options', () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByRole('combobox', { name: /Actif dans SIRENA/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sélectionnez une option' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Oui' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Non' })).toBeInTheDocument();
  });

  it('shows zod validation errors', async () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    expect(screen.getByLabelText(/Nom - libellé long/i)).not.toHaveAttribute('required');
    expect(screen.getByLabelText(/Nom court/i)).not.toHaveAttribute('required');
    expect(screen.getByRole('combobox', { name: /Actif dans SIRENA/i })).not.toHaveAttribute('required');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    expect(
      await screen.findByText('Le champ "Nom - libellé long" est vide. Veuillez le renseigner.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Le champ "Nom court" est vide. Veuillez le renseigner.')).toBeInTheDocument();
    expect(
      screen.getByText('Le statut actif dans SIRENA est obligatoire. Veuillez sélectionner une option.'),
    ).toBeInTheDocument();
    expect(createChildEntiteAdminMutateAsyncSpy).not.toHaveBeenCalled();
  });

  it('validates emails and phone number', async () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    render(<RouteComponent />);

    const user = userEvent.setup();
    const contactGroup = screen.getByRole('group', { name: /Éléments de contact pour l’usager/i });

    await user.type(screen.getByLabelText(/Nom - libellé long/i), 'Direction de la prévention');
    await user.type(screen.getByLabelText(/Nom court/i), 'DIR PREV');
    await user.type(screen.getByLabelText(/Adresse électronique de notification/i), 'invalid-email');
    await user.type(within(contactGroup).getByLabelText(/Adresse électronique/i), 'invalid-contact-email');
    await user.type(within(contactGroup).getByLabelText(/Numéro de téléphone/i), '123');
    await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/i }), 'oui');
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    expect(await screen.findAllByText(/L’adresse e-mail est invalide/i)).toHaveLength(2);
    expect(
      screen.getByText(/Le numéro de téléphone doit être au format national ou international/i),
    ).toBeInTheDocument();
    expect(createChildEntiteAdminMutateAsyncSpy).not.toHaveBeenCalled();
  });

  it('submits the child creation form to the admin mutation with a flat payload', async () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );
    createChildEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'direction-1',
      nomComplet: 'Direction de la prévention',
      label: 'DIR PREV',
      email: 'direction@example.fr',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: false,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();
    const contactGroup = screen.getByRole('group', { name: /Éléments de contact pour l’usager/i });

    await user.type(screen.getByLabelText(/Nom - libellé long/i), 'Direction de la prévention');
    await user.type(screen.getByLabelText(/Nom court/i), 'DIR PREV');
    await user.type(screen.getByLabelText(/Adresse électronique de notification/i), 'direction@example.fr');
    await user.type(within(contactGroup).getByLabelText(/Adresse électronique/i), 'contact-usager@example.fr');
    await user.type(within(contactGroup).getByLabelText(/Adresse postale/i), '1 rue de la République, 75000 Paris');
    await user.type(within(contactGroup).getByLabelText(/Numéro de téléphone/i), '01 02 03 04 05');
    await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/i }), 'non');
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(createChildEntiteAdminMutateAsyncSpy).toHaveBeenCalledWith({
        id: 'root-ars',
        input: {
          nomComplet: 'Direction de la prévention',
          label: 'DIR PREV',
          email: 'direction@example.fr',
          emailContactUsager: 'contact-usager@example.fr',
          adresseContactUsager: '1 rue de la République, 75000 Paris',
          telContactUsager: '01 02 03 04 05',
          isActive: false,
        },
      });
    });
  });

  it('ignores duplicate submissions while child creation is already in progress', async () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );

    let resolveCreation:
      | ((value: {
          id: string;
          nomComplet: string;
          label: string;
          email: string;
          emailContactUsager: string;
          adresseContactUsager: string;
          telContactUsager: string;
          isActive: boolean;
        }) => void)
      | undefined;
    createChildEntiteAdminMutateAsyncSpy.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreation = resolve;
        }),
    );

    render(<RouteComponent />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Nom - libellé long/i), 'Direction de la prévention');
    await user.type(screen.getByLabelText(/Nom court/i), 'DIR PREV');
    await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/i }), 'oui');
    await user.dblClick(screen.getByRole('button', { name: 'Créer' }));

    expect(createChildEntiteAdminMutateAsyncSpy).toHaveBeenCalledTimes(1);
    expect(resolveCreation).toBeDefined();

    resolveCreation?.({
      id: 'direction-1',
      nomComplet: 'Direction de la prévention',
      label: 'DIR PREV',
      email: 'direction@example.fr',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: true,
    });

    await waitFor(() => {
      expect(routerNavigateSpy).toHaveBeenCalledWith({
        to: '/admin/entites/$entiteId',
        params: { entiteId: 'direction-1' },
      });
    });
  });

  it('shows a success toast after creating the child entity', async () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );
    createChildEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'direction-1',
      nomComplet: 'Direction de la prévention',
      label: 'DIR PREV',
      email: 'direction@example.fr',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: true,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Nom - libellé long/i), 'Direction de la prévention');
    await user.type(screen.getByLabelText(/Nom court/i), 'DIR PREV');
    await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/i }), 'oui');
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Entité créée avec succès',
        description: 'La nouvelle entité a bien été enregistrée.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    });
  });

  it('navigates to the created entity edit page after creating the child entity', async () => {
    vi.mocked(useEntiteByIdAdmin).mockReturnValue(
      buildSuccessQuery({
        id: 'root-ars',
        nomComplet: 'ARS Normandie',
        label: 'ARS NOR',
        isActive: true,
      }),
    );
    vi.mocked(useEntiteChain).mockReturnValue(
      buildSuccessQuery([{ id: 'root-ars', nomComplet: 'ARS Normandie', disabled: false }]),
    );
    createChildEntiteAdminMutateAsyncSpy.mockResolvedValueOnce({
      id: 'direction-1',
      nomComplet: 'Direction de la prévention',
      label: 'DIR PREV',
      email: 'direction@example.fr',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: true,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Nom - libellé long/i), 'Direction de la prévention');
    await user.type(screen.getByLabelText(/Nom court/i), 'DIR PREV');
    await user.selectOptions(screen.getByRole('combobox', { name: /Actif dans SIRENA/i }), 'oui');
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(routerNavigateSpy).toHaveBeenCalledWith({
        to: '/admin/entites/$entiteId',
        params: { entiteId: 'direction-1' },
      });
    });
  });
});
