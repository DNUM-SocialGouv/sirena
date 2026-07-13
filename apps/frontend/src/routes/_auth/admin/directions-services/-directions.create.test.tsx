import { FEATURE_FLAGS, ROLES } from '@sirena/common/constants';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchResolvedFeatureFlags } from '@/lib/api/fetchFeatureFlags';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { queryClient } from '@/lib/queryClient';
import { Route, RouteComponent } from './directions.create';

const { authGuardSpy, redirectSpy } = vi.hoisted(() => ({
  authGuardSpy: vi.fn(),
  redirectSpy: vi.fn((args: unknown) => ({ redirect: args })),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  redirect: redirectSpy,
}));

vi.mock('@/lib/api/fetchFeatureFlags', () => ({
  fetchResolvedFeatureFlags: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
}));

vi.mock('@/lib/auth-guards', () => ({
  requireAuthAndRoles: vi.fn(() => authGuardSpy),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Direction create route', () => {
  it('restricts the route to entity admins', () => {
    expect(vi.mocked(requireAuthAndRoles)).toHaveBeenCalledWith([ROLES.ENTITY_ADMIN]);
    expect((Route as unknown as { beforeLoad: unknown }).beforeLoad).toBeTypeOf('function');
  });

  it('redirects to admin users from beforeLoad when the feature flag is disabled', async () => {
    vi.mocked(queryClient.ensureQueryData).mockResolvedValueOnce({
      [FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES]: false,
    });

    await expect(
      (Route as unknown as { beforeLoad: (ctx: unknown) => Promise<void> }).beforeLoad({ location: { href: '' } }),
    ).rejects.toEqual({ redirect: { to: '/admin/users' } });
    expect(fetchResolvedFeatureFlags).not.toHaveBeenCalled();
  });

  it('renders the local Direction creation form sections from the mockup', () => {
    render(<RouteComponent />);

    expect(screen.getByRole('heading', { level: 2, name: 'Créer une direction' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Directions et services/ })).toHaveAttribute(
      'href',
      '/admin/directions-services',
    );
    expect(screen.getByRole('group', { name: 'Informations utilisées dans SIRENA' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Nom de la direction \(obligatoire\)/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Abréviation \(obligatoire\)/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Informations de contact pour l’usager' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/l’adresse e-mail de notification sera transmise au déclarant/);
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Numéro de téléphone/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Adresse postale/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/admin/directions-services');
    expect(screen.getByRole('button', { name: 'Ajouter la direction' })).toBeInTheDocument();
    expect(document.title).toBe('Créer une direction - Directions et services - SIRENA');
  });

  it('shows required-field errors when submitting an empty Direction form', async () => {
    const user = userEvent.setup();
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));

    expect(screen.getByText('Le champ "Nom de la direction" est vide. Veuillez le renseigner.')).toBeInTheDocument();
    expect(screen.getByText('Le champ "Abréviation" est vide. Veuillez le renseigner.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Nom de la direction \(obligatoire\)/ })).toHaveFocus();
  });

  it('clears required-field errors as the submitted Direction form is corrected', async () => {
    const user = userEvent.setup();
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));
    await user.type(
      screen.getByRole('textbox', { name: /Nom de la direction \(obligatoire\)/ }),
      'Direction Autonomie',
    );
    await user.type(screen.getByRole('textbox', { name: /Abréviation \(obligatoire\)/ }), 'DA');

    expect(
      screen.queryByText('Le champ "Nom de la direction" est vide. Veuillez le renseigner.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Le champ "Abréviation" est vide. Veuillez le renseigner.')).not.toBeInTheDocument();
  });

  it('shows the shared email-format error for an invalid notification email', async () => {
    const user = userEvent.setup();
    render(<RouteComponent />);

    await user.type(
      screen.getByRole('textbox', { name: /Nom de la direction \(obligatoire\)/ }),
      'Direction Autonomie',
    );
    await user.type(screen.getByRole('textbox', { name: /Abréviation \(obligatoire\)/ }), 'DA');
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ }), 'invalid-email');
    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));

    expect(
      screen.getByText('L’adresse e-mail est invalide. Merci de saisir une adresse au format prenom.nom@exemple.com.'),
    ).toBeInTheDocument();
  });

  it('shows the email-format error for an invalid contact email', async () => {
    const user = userEvent.setup();
    render(<RouteComponent />);

    await user.type(
      screen.getByRole('textbox', { name: /Nom de la direction \(obligatoire\)/ }),
      'Direction Autonomie',
    );
    await user.type(screen.getByRole('textbox', { name: /Abréviation \(obligatoire\)/ }), 'DA');
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ }), 'invalid-contact-email');
    await user.click(screen.getByRole('button', { name: 'Ajouter la direction' }));

    expect(
      screen.getByText('L’adresse e-mail est invalide. Merci de saisir une adresse au format prenom.nom@exemple.com.'),
    ).toBeInTheDocument();
  });
});
