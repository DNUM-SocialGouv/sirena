import { ROLES } from '@sirena/common/constants';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateDirectionAdminLocal } from '@/hooks/queries/entites.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { requireAdminLocalDirectionCreation } from './-create-route-guard';
import { Route, RouteComponent } from './directions.create';

const { addToastSpy, authGuardSpy, routerNavigateSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  authGuardSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  redirect: vi.fn(),
  useRouter: () => ({ navigate: routerNavigateSpy }),
}));
vi.mock('@/hooks/queries/entites.hook', () => ({ useCreateDirectionAdminLocal: vi.fn() }));
vi.mock('@/lib/api/fetchEntites', () => ({ fetchDirectionsServicesList: vi.fn() }));
vi.mock('@/lib/api/fetchFeatureFlags', () => ({ fetchResolvedFeatureFlags: vi.fn() }));
vi.mock('@/hooks/queries/profile.hook', () => ({ profileQueryOptions: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { ensureQueryData: vi.fn(), fetchQuery: vi.fn() } }));
vi.mock('@/lib/auth-guards', () => ({ requireAuthAndRoles: vi.fn(() => authGuardSpy) }));
vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return { ...actual, Toast: { useToastManager: () => ({ add: addToastSpy }) } };
});

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('textbox', { name: /Nom de la direction \(obligatoire\)/ }), 'Direction Autonomie');
  await user.type(screen.getByRole('textbox', { name: /Abréviation \(obligatoire\)/ }), 'DA');
}

beforeEach(() => {
  vi.mocked(useCreateDirectionAdminLocal).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'dir-autonomie' }),
    isPending: false,
  } as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Direction create route', () => {
  it('uses the entity-admin Direction creation guard', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.ENTITY_ADMIN]);
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBe(requireAdminLocalDirectionCreation);
  });

  it('renders the Direction-specific creation form', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('heading', { name: 'Ajouter une direction' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Informations utilisées dans SIRENA' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Nom de la direction/ })).toBeEnabled();
    expect(screen.getByText(/Direction de l’Offre de Soins/)).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Abréviation/ })).toBeEnabled();
    expect(screen.getByText(/Sigle, acronyme ou forme abrégée du nom.*DOS/)).toBeVisible();
    expect(screen.getByRole('group', { name: 'Informations de contact pour l’usager' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Actif dans SIRENA/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/admin/directions-services');
    expect(document.title).toBe('Ajouter une direction - Directions et services - SIRENA');
  });

  it('shows required errors, focuses the first field and clears errors as values are entered', async () => {
    const user = userEvent.setup();
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));
    const name = screen.getByRole('textbox', { name: /Nom de la direction/ });
    const label = screen.getByRole('textbox', { name: /Abréviation/ });
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription('Le champ "Nom de la direction" est vide. Veuillez le renseigner.');
    expect(label).toHaveAccessibleDescription('Le champ "Abréviation" est vide. Veuillez le renseigner.');

    await user.type(name, 'Direction Autonomie');
    await user.type(label, 'DA');
    expect(name).not.toHaveAccessibleDescription();
    expect(label).not.toHaveAccessibleDescription();
  });

  it.each([
    ['Adresse e-mail de notification', 'invalid-email', /L’adresse e-mail est invalide/],
    ['Adresse e-mail de contact', 'invalid-contact-email', /L’adresse e-mail est invalide/],
    ['Numéro de téléphone', '123', /Le numéro de téléphone doit être au format national ou international/],
  ] as const)('rejects an invalid %s', async (fieldName, value, message) => {
    const user = userEvent.setup();
    render(<RouteComponent />);
    await fillRequiredFields(user);
    await user.type(screen.getByRole('textbox', { name: new RegExp(fieldName) }), value);

    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('submits visible fields, shows success and returns to the list', async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({ id: 'dir-autonomie' });
    vi.mocked(useCreateDirectionAdminLocal).mockReturnValue({ mutateAsync, isPending: false } as never);
    render(<RouteComponent />);

    await fillRequiredFields(user);
    await user.type(
      screen.getByRole('textbox', { name: /Adresse e-mail de notification/ }),
      'reclamations@direction.fr',
    );
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ }), 'contact@direction.fr');
    await user.type(screen.getByRole('textbox', { name: /Numéro de téléphone/ }), '0102030405');
    await user.type(screen.getByRole('textbox', { name: /Adresse postale/ }), '1 rue de la République, 75000 Paris');
    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        nomComplet: 'Direction Autonomie',
        label: 'DA',
        email: 'reclamations@direction.fr',
        emailContactUsager: 'contact@direction.fr',
        telContactUsager: '0102030405',
        adresseContactUsager: '1 rue de la République, 75000 Paris',
      });
      expect(addToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Direction créée avec succès' }));
      expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/directions-services' });
    });
  });

  it('shows an error and stays on the form when creation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(useCreateDirectionAdminLocal).mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Creation failed')),
      isPending: false,
    } as never);
    render(<RouteComponent />);
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));

    await waitFor(() =>
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Erreur lors de la création de la direction. Veuillez réessayer.',
        timeout: 0,
        data: { icon: 'fr-alert--error' },
      }),
    );
    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });
});
