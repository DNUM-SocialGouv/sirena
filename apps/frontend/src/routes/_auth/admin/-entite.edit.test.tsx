import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEditEntiteAdministrativeAdminLocal, useEntiteAdministrativeAdminLocal } from '@/hooks/queries/entites.hook';
import { requireAdminLocalEntiteAccess } from './-admin-local-route-guard';
import { Route as EntiteRoute } from './entite';
import { RouteComponent } from './entite.edit';

const { addToastSpy, editMutateAsyncSpy, routerNavigateSpy } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  editMutateAsyncSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  Outlet: () => null,
  useRouter: () => ({ navigate: routerNavigateSpy }),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useEntiteAdministrativeAdminLocal: vi.fn(),
  useEditEntiteAdministrativeAdminLocal: vi.fn(() => ({ mutateAsync: editMutateAsyncSpy, isPending: false })),
}));

vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return { ...actual, Toast: { useToastManager: () => ({ add: addToastSpy }) } };
});

vi.mock('./-admin-local-route-guard', () => ({
  requireAdminLocalEntiteAccess: vi.fn(),
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

    expect((EntiteRoute as unknown as { beforeLoad: unknown }).beforeLoad).toBe(requireAdminLocalEntiteAccess);
    expect(screen.getByRole('heading', { name: 'Modifier l’entité administrative ARS Normandie' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Nom de l’entité administrative/ })).toHaveValue('ARS Normandie');
    expect(screen.getByRole('textbox', { name: /Abréviation/ })).toHaveValue('ARS NOR');
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de notification/ })).toHaveValue('notification@ars.fr');
    expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toHaveValue('contact@ars.fr');
    expect(screen.getByRole('textbox', { name: /Numéro de téléphone/ })).toHaveValue('0102030405');
    expect(screen.getByText('Format attendu : 10 chiffres ou +33XXXXXXXXXX (international)')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Adresse postale/ })).toHaveValue('1 rue de la Santé, Paris');
    expect(screen.getByText('Sauf mention contraire, les champs sont facultatifs.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Actif dans SIRENA/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Direction \(obligatoire\)/ })).not.toBeInTheDocument();
    expect(document.title).toBe('Modifier l’entité administrative ARS Normandie - Espace administrateur - SIRENA');
  });

  it('presents the assigned Entité identity as immutable information', () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);

    const name = screen.getByRole('textbox', { name: /^Nom de l’entité administrative(?! \(obligatoire\))/ });
    const abbreviation = screen.getByRole('textbox', { name: /^Abréviation(?! \(obligatoire\))/ });

    expect(name).toHaveAttribute('readonly');
    expect(name).not.toBeDisabled();
    expect(abbreviation).toHaveAttribute('readonly');
    expect(abbreviation).not.toBeDisabled();
  });

  it('submits exactly the four editable notification and contact fields', async () => {
    const user = userEvent.setup();
    editMutateAsyncSpy.mockResolvedValueOnce(assignedEntite);
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);

    const notificationEmail = screen.getByRole('textbox', { name: /Adresse e-mail de notification/ });
    const contactEmail = screen.getByRole('textbox', { name: /Adresse e-mail de contact/ });
    const telephone = screen.getByRole('textbox', { name: /Numéro de téléphone/ });
    const postalAddress = screen.getByRole('textbox', { name: /Adresse postale/ });
    await user.clear(notificationEmail);
    await user.type(notificationEmail, 'notifications@ars.fr');
    await user.clear(contactEmail);
    await user.type(contactEmail, 'usagers@ars.fr');
    await user.clear(telephone);
    await user.type(telephone, '0203040506');
    await user.clear(postalAddress);
    await user.type(postalAddress, '2 rue de la Santé, Paris');
    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    await waitFor(() =>
      expect(editMutateAsyncSpy).toHaveBeenCalledWith({
        email: 'notifications@ars.fr',
        emailContactUsager: 'usagers@ars.fr',
        telContactUsager: '0203040506',
        adresseContactUsager: '2 rue de la Santé, Paris',
      }),
    );
  });

  it('cancels back to the consultation route without submitting changes', async () => {
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);

    expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/admin/entite');
    expect(editMutateAsyncSpy).not.toHaveBeenCalled();
  });

  it('confirms a successful save and returns to the Entité consultation route', async () => {
    const user = userEvent.setup();
    editMutateAsyncSpy.mockResolvedValueOnce({ ...assignedEntite, nomComplet: 'ARS de Normandie' });
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);

    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    await waitFor(() =>
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Entité administrative modifiée avec succès',
        description: 'Les modifications ont bien été enregistrées.',
        timeout: 0,
        data: { icon: 'fr-alert--success' },
      }),
    );
    expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/entite' });
  });

  it('shows an error, retains input, stays on the form, and allows retry after a failed save', async () => {
    const user = userEvent.setup();
    editMutateAsyncSpy
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce({ ...assignedEntite, emailContactUsager: 'usagers@ars.fr' });
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);
    render(<RouteComponent />);
    const contactEmail = screen.getByRole('textbox', { name: /Adresse e-mail de contact/ });
    await user.clear(contactEmail);
    await user.type(contactEmail, 'usagers@ars.fr');

    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    await waitFor(() =>
      expect(addToastSpy).toHaveBeenCalledWith({
        title: 'Erreur',
        description: 'Erreur lors de la modification de l’entité administrative. Veuillez réessayer.',
        timeout: 0,
        data: { icon: 'fr-alert--error' },
      }),
    );
    expect(routerNavigateSpy).not.toHaveBeenCalled();
    expect(contactEmail).toHaveValue('usagers@ars.fr');

    await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

    await waitFor(() => expect(editMutateAsyncSpy).toHaveBeenCalledTimes(2));
    expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/entite' });
  });

  it('prevents duplicate submission while the update is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: assignedEntite,
      isPending: false,
      isError: false,
    } as never);
    vi.mocked(useEditEntiteAdministrativeAdminLocal).mockReturnValueOnce({
      mutateAsync: editMutateAsyncSpy,
      isPending: true,
    } as never);
    render(<RouteComponent />);

    const submit = screen.getByRole('button', { name: 'Valider les modifications' });
    expect(submit).toBeDisabled();
    await user.click(submit);
    expect(editMutateAsyncSpy).not.toHaveBeenCalled();
  });

  it('does not validate read-only identity and accepts empty optional contact fields', async () => {
    const user = userEvent.setup();
    vi.mocked(useEntiteAdministrativeAdminLocal).mockReturnValue({
      data: {
        ...assignedEntite,
        nomComplet: '',
        label: '',
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

    await waitFor(() =>
      expect(editMutateAsyncSpy).toHaveBeenCalledWith({
        email: '',
        emailContactUsager: '',
        telContactUsager: '',
        adresseContactUsager: '',
      }),
    );
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
