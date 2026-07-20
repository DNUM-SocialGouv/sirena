import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEntiteAdministrativeAdminLocal } from '@/hooks/queries/entites.hook';
import { requireAdminLocalEntite } from './directions-services/-route-guard';
import { Route as EntiteRoute } from './entite';
import { RouteComponent } from './entite.edit';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  Outlet: () => null,
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteAdministrativeAdminLocal: vi.fn(),
}));

vi.mock('./directions-services/-route-guard', () => ({
  requireAdminLocalEntite: vi.fn(),
}));

const assignedEntite = {
  id: 'root-ars',
  nomComplet: 'ARS Normandie',
  label: 'ARS NOR',
  email: 'notification@ars.fr',
  emailContactUsager: 'contact@ars.fr',
  telContactUsager: '0102030405',
  adresseContactUsager: '1 rue de la Santé, Paris',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('Admin local Entité edit route', () => {
  it('announces loading and displays an explicit error when loading fails', () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
    } as never);
    const view = render(<RouteComponent />);
    expect(screen.getByRole('progressbar')).toHaveTextContent('Chargement en cours...');

    view.unmount();
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    } as never);
    render(<RouteComponent />);
    expect(screen.getByText('Erreur lors du chargement de l’entité.')).toBeInTheDocument();
  });

  it('uses the protected local Entité guard and displays the assigned Entité in a prefilled form', () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);

    render(<RouteComponent />);

    expect((EntiteRoute as unknown as { beforeLoad: unknown }).beforeLoad).toBe(requireAdminLocalEntite);
    expect(screen.getByRole('heading', { name: 'Modifier l’entité administrative ARS Normandie' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Nom de l’entité administrative/ })).toHaveValue('ARS Normandie');
    expect(screen.getByRole('textbox', { name: /Abréviation/ })).toHaveValue('ARS NOR');
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ })).toHaveValue('notification@ars.fr');
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toHaveValue('contact@ars.fr');
    expect(screen.getByRole('textbox', { name: /Numéro de téléphone/ })).toHaveValue('0102030405');
    expect(screen.getByRole('textbox', { name: /Adresse postale/ })).toHaveValue('1 rue de la Santé, Paris');
    expect(screen.getByText('Sauf mention contraire, les champs sont facultatifs.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Actif dans SIRENA/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Direction \(obligatoire\)/ })).not.toBeInTheDocument();
    expect(document.title).toBe('Modifier l’entité administrative ARS Normandie - Espace administrateur - SIRENA');
  });

  it('requires the name and abbreviation and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);
    const name = screen.getByRole('textbox', { name: /Nom de l’entité administrative/ });
    const abbreviation = screen.getByRole('textbox', { name: /Abréviation/ });

    await user.clear(name);
    await user.clear(abbreviation);
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    expect(name).toHaveFocus();
    expect(screen.getByText(/Le champ "Nom de l’entité administrative" est vide/)).toBeInTheDocument();
    expect(screen.getByText(/Le champ "Abréviation" est vide/)).toBeInTheDocument();
  });

  it('accepts empty optional contact fields', async () => {
    const user = userEvent.setup();
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: {
        ...assignedEntite,
        email: '',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
      },
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    expect(screen.queryByText(/est invalide|doit être au format/)).not.toBeInTheDocument();
  });

  it('validates optional e-mail and telephone fields and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: { ...assignedEntite, email: '', emailContactUsager: '', telContactUsager: '' },
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);
    const notificationEmail = screen.getByRole('textbox', { name: /Adresse e-mail de notification/ });

    await user.type(notificationEmail, 'notification-invalide');
    await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ }), 'contact-invalide');
    await user.type(screen.getByRole('textbox', { name: /Numéro de téléphone/ }), '123');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    expect(notificationEmail).toHaveFocus();
    expect(screen.getAllByText(/L’adresse e-mail est invalide/)).toHaveLength(2);
    expect(
      screen.getByText(/Le numéro de téléphone doit être au format national ou international/),
    ).toBeInTheDocument();
  });
});
