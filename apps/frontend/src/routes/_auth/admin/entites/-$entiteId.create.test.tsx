import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntiteByIdAdmin, useEntiteChain } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { Route, RouteComponent } from './$entiteId.create';

const { addToastSpy, routerBackSpy, routerNavigateSpy, historyLengthState, createChildEntiteAdminMutateAsyncSpy } =
  vi.hoisted(() => ({
    addToastSpy: vi.fn(),
    routerBackSpy: vi.fn(),
    routerNavigateSpy: vi.fn(),
    historyLengthState: { value: 2 },
    createChildEntiteAdminMutateAsyncSpy: vi.fn(),
  }));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: 'root-ars' }),
  }),
  Link: ({ to, params, children }: { to: string; params?: { entiteId?: string }; children: React.ReactNode }) => (
    <a href={to.replace('$entiteId', params?.entiteId ?? '')}>{children}</a>
  ),
  useRouter: () => ({
    history: { back: routerBackSpy },
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

const setHistoryLength = (length: number) => {
  Object.defineProperty(window.history, 'length', {
    configurable: true,
    value: length,
  });
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  createChildEntiteAdminMutateAsyncSpy.mockReset();
  routerBackSpy.mockReset();
  routerNavigateSpy.mockReset();
  historyLengthState.value = 2;
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

    expect(screen.getByRole('heading', { level: 1, name: 'Créer une direction' })).toBeInTheDocument();
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

    expect(screen.getByRole('heading', { level: 1, name: 'Créer un service' })).toBeInTheDocument();
  });

  it('renders the child creation name fields with the agreed labels', () => {
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

    expect(screen.getByLabelText(/Nom \(libellé long\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nom court/i)).toBeInTheDocument();
  });

  it('renders the notification and organizational fields with the agreed labels', () => {
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
    expect(screen.getByLabelText(/Domaine e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unité organisationnelle/i)).toBeInTheDocument();
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
    expect(within(contactGroup).getByLabelText(/Adresse postale/i)).toBeInTheDocument();
    expect(within(contactGroup).getByLabelText(/Téléphone/i)).toBeInTheDocument();
  });

  it('renders the active status choice with Oui / Non options', () => {
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

    expect(screen.getByRole('group', { name: /Actif dans SIRENA/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Oui' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Non' })).toBeInTheDocument();
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
      emailDomain: '@example.fr',
      organizationalUnit: 'DIR-PREV',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: false,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();
    const contactGroup = screen.getByRole('group', { name: /Éléments de contact pour l’usager/i });

    await user.type(screen.getByLabelText(/Nom \(libellé long\)/i), 'Direction de la prévention');
    await user.type(screen.getByLabelText(/Nom court/i), 'DIR PREV');
    await user.type(screen.getByLabelText(/Adresse électronique de notification/i), 'direction@example.fr');
    await user.type(screen.getByLabelText(/Domaine e-mail/i), '@example.fr');
    await user.type(screen.getByLabelText(/Unité organisationnelle/i), 'DIR-PREV');
    await user.type(within(contactGroup).getByLabelText(/^Adresse électronique$/i), 'contact-usager@example.fr');
    await user.type(within(contactGroup).getByLabelText(/Adresse postale/i), '1 rue de la République, 75000 Paris');
    await user.type(within(contactGroup).getByLabelText(/Téléphone/i), '01 02 03 04 05');
    await user.click(screen.getByRole('radio', { name: 'Non' }));
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(createChildEntiteAdminMutateAsyncSpy).toHaveBeenCalledWith({
        id: 'root-ars',
        input: {
          nomComplet: 'Direction de la prévention',
          label: 'DIR PREV',
          email: 'direction@example.fr',
          emailDomain: '@example.fr',
          organizationalUnit: 'DIR-PREV',
          emailContactUsager: 'contact-usager@example.fr',
          adresseContactUsager: '1 rue de la République, 75000 Paris',
          telContactUsager: '01 02 03 04 05',
          isActive: false,
        },
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
      emailDomain: '@example.fr',
      organizationalUnit: 'DIR-PREV',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: true,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Nom \(libellé long\)/i), 'Direction de la prévention');
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Entité créée',
        description: 'La nouvelle entité a été enregistrée avec succès.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      });
    });
  });

  it('navigates back after creating the child entity successfully', async () => {
    setHistoryLength(2);

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
      emailDomain: '@example.fr',
      organizationalUnit: 'DIR-PREV',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: true,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Nom \(libellé long\)/i), 'Direction de la prévention');
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(routerBackSpy).toHaveBeenCalled();
    });
  });

  it('falls back to the entities list when browser history is unavailable after create', async () => {
    historyLengthState.value = 1;
    setHistoryLength(historyLengthState.value);

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
      emailDomain: '@example.fr',
      organizationalUnit: 'DIR-PREV',
      emailContactUsager: 'contact-usager@example.fr',
      adresseContactUsager: '1 rue de la République, 75000 Paris',
      telContactUsager: '01 02 03 04 05',
      isActive: true,
    });

    render(<RouteComponent />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Nom \(libellé long\)/i), 'Direction de la prévention');
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    await waitFor(() => {
      expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/entites' });
    });
    expect(routerBackSpy).not.toHaveBeenCalled();
  });
});
