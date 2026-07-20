import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { useDirectionServiceAdminLocal } from '@/hooks/queries/entites.hook';
import { RouteComponent } from './$entiteId.edit';

const { addToastSpy, editMutateAsyncSpy, routerNavigateSpy, currentEntiteId } = vi.hoisted(() => ({
  addToastSpy: vi.fn(),
  editMutateAsyncSpy: vi.fn(),
  routerNavigateSpy: vi.fn(),
  currentEntiteId: { value: 'dir-autonomie' },
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useParams: () => ({ entiteId: currentEntiteId.value }),
  }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  redirect: vi.fn(),
  useRouter: () => ({ navigate: routerNavigateSpy }),
}));

vi.mock('@/hooks/queries/entites.hook', () => ({
  useDirectionServiceAdminLocal: vi.fn(),
  useEditDirectionServiceAdminLocal: () => ({ mutateAsync: editMutateAsyncSpy, isPending: false }),
}));

vi.mock('@/lib/api/fetchFeatureFlags', () => ({ fetchResolvedFeatureFlags: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { ensureQueryData: vi.fn() } }));
vi.mock('@/lib/auth-guards', () => ({ requireAuthAndRoles: vi.fn(() => vi.fn()) }));
vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return { ...actual, Toast: { useToastManager: () => ({ add: addToastSpy }) } };
});

const directionTarget = {
  id: 'dir-autonomie',
  kind: 'direction' as const,
  nomComplet: 'Direction Autonomie',
  label: 'DA',
  email: 'direction-autonomie@ars.fr',
  emailContactUsager: 'contact-autonomie@ars.fr',
  telContactUsager: '0102030405',
  adresseContactUsager: '1 rue de la Santé, Paris',
};

const serviceTarget = {
  ...directionTarget,
  id: 'service-pa',
  kind: 'service' as const,
  nomComplet: 'Service PA',
  label: 'PA',
  email: 'service-pa@ars.fr',
  emailContactUsager: 'contact-pa@ars.fr',
  parentDirection: { id: 'dir-autonomie', nomComplet: 'Direction Autonomie', label: 'DA' },
};

function mockTarget(target: typeof directionTarget | typeof serviceTarget) {
  vi.mocked(useDirectionServiceAdminLocal).mockReturnValue({
    data: target,
    isPending: false,
    isError: false,
  } as never);
}

function renderTarget(target: typeof directionTarget | typeof serviceTarget) {
  mockTarget(target);
  return render(<RouteComponent />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
  currentEntiteId.value = 'dir-autonomie';
});

it('shows a loading state while an edit target is requested', () => {
  vi.mocked(useDirectionServiceAdminLocal).mockReturnValue({ isPending: true } as never);

  render(<RouteComponent />);

  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

it('leaves the former root edit URL unsupported without redirecting it', () => {
  currentEntiteId.value = 'root-ars';
  vi.mocked(useDirectionServiceAdminLocal).mockReturnValue({ isPending: false, isError: true } as never);

  render(<RouteComponent />);

  expect(useDirectionServiceAdminLocal).toHaveBeenCalledWith('root-ars');
  expect(screen.getByText('Erreur lors du chargement.')).toBeInTheDocument();
  expect(routerNavigateSpy).not.toHaveBeenCalled();
});

it('renders a prefilled local Direction form with contact fields and no activation control', () => {
  renderTarget(directionTarget);

  expect(screen.getByRole('heading', { name: 'Modifier la direction Direction Autonomie' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Nom de la direction/ })).toHaveValue('Direction Autonomie');
  expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toHaveValue('contact-autonomie@ars.fr');
  expect(screen.getByRole('textbox', { name: /Numéro de téléphone/ })).toHaveValue('0102030405');
  expect(screen.queryByRole('combobox', { name: /Actif dans SIRENA/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/admin/directions-services');
  expect(document.title).toBe('Modifier la direction Direction Autonomie - Directions et services - SIRENA');
});

it('validates and saves visible Direction fields before returning to the list', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockResolvedValueOnce({ id: directionTarget.id });
  renderTarget(directionTarget);

  const nameInput = screen.getByRole('textbox', { name: /Nom de la direction/ });
  await user.clear(nameInput);
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));
  expect(editMutateAsyncSpy).not.toHaveBeenCalled();
  expect(nameInput).toHaveFocus();

  await user.type(nameInput, 'Direction Autonomie et Handicap');
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() =>
    expect(editMutateAsyncSpy).toHaveBeenCalledWith({
      id: directionTarget.id,
      input: {
        nomComplet: 'Direction Autonomie et Handicap',
        label: directionTarget.label,
        email: directionTarget.email,
        emailContactUsager: directionTarget.emailContactUsager,
        telContactUsager: directionTarget.telContactUsager,
        adresseContactUsager: directionTarget.adresseContactUsager,
      },
    }),
  );
  expect(addToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Direction modifiée avec succès' }));
  expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/directions-services' });
});

it('renders a Service with its current Direction first and read-only', () => {
  renderTarget(serviceTarget);

  expect(screen.getByRole('heading', { name: 'Modifier le service Service PA' })).toBeInTheDocument();
  const direction = screen.getByRole('textbox', { name: /Direction \(obligatoire\)/ });
  const serviceName = screen.getByRole('textbox', { name: /Nom du service \(obligatoire\)/ });
  expect(direction).toHaveValue('Direction Autonomie (DA)');
  expect(direction).toHaveAttribute('readonly');
  expect(direction.compareDocumentPosition(serviceName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toHaveValue('contact-pa@ars.fr');
  expect(document.title).toBe('Modifier le service Service PA - Directions et services - SIRENA');
});

it('saves Service contact fields without status or replacement Direction', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockResolvedValueOnce({ id: serviceTarget.id });
  renderTarget(serviceTarget);

  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() =>
    expect(editMutateAsyncSpy).toHaveBeenCalledWith({
      id: serviceTarget.id,
      input: {
        nomComplet: serviceTarget.nomComplet,
        label: serviceTarget.label,
        email: serviceTarget.email,
        emailContactUsager: serviceTarget.emailContactUsager,
        telContactUsager: serviceTarget.telContactUsager,
        adresseContactUsager: serviceTarget.adresseContactUsager,
      },
    }),
  );
});

it('rejects invalid contact values before saving an edit', async () => {
  const user = userEvent.setup();
  renderTarget({ ...serviceTarget, emailContactUsager: '', telContactUsager: '' });

  await user.type(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ }), 'adresse-invalide');
  await user.type(screen.getByRole('textbox', { name: /Numéro de téléphone/ }), '123');
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  expect(screen.getByRole('textbox', { name: /Adresse e-mail de contact/ })).toHaveFocus();
  expect(screen.getByText(/L’adresse e-mail est invalide/)).toBeInTheDocument();
  expect(screen.getByText(/Le numéro de téléphone doit être au format national ou international/)).toBeInTheDocument();
  expect(editMutateAsyncSpy).not.toHaveBeenCalled();
});

it('shows an error and stays on the edit form when saving fails', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockRejectedValueOnce(new Error('Request failed'));
  renderTarget(serviceTarget);

  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() =>
    expect(addToastSpy).toHaveBeenCalledWith({
      title: 'Erreur',
      description: 'Erreur lors de la modification du service. Veuillez réessayer.',
      timeout: 0,
      data: { icon: 'fr-alert--error' },
    }),
  );
  expect(routerNavigateSpy).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Modifier le service Service PA' })).toBeInTheDocument();
});
