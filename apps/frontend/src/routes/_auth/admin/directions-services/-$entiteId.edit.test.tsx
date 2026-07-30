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
vi.mock('@/hooks/queries/profile.hook', () => ({ profileQueryOptions: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { ensureQueryData: vi.fn() } }));
vi.mock('@/lib/auth-guards', () => ({ requireAuthAndRoles: vi.fn(() => vi.fn()) }));
vi.mock('@sirena/ui', async () => {
  const actual = await vi.importActual<typeof import('@sirena/ui')>('@sirena/ui');
  return { ...actual, Toast: { useToastManager: () => ({ add: addToastSpy }) } };
});

const directionTarget = {
  id: 'dir-autonomie',
  entiteType: 'direction' as const,
  nomComplet: 'Direction Autonomie',
  label: 'DA',
  email: 'direction-autonomie@ars.fr',
};

const serviceTarget = {
  ...directionTarget,
  id: 'service-pa',
  entiteType: 'service' as const,
  nomComplet: 'Service PA',
  label: 'PA',
  email: 'service-pa@ars.fr',
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

it('renders prefilled Direction identity as accessible read-only information', () => {
  renderTarget(directionTarget);

  expect(screen.getByRole('heading', { name: 'Modifier la direction Direction Autonomie' })).toBeInTheDocument();
  const nameInput = screen.getByRole('textbox', { name: /^Nom de la direction/ });
  const abbreviationInput = screen.getByRole('textbox', { name: /^Abréviation/ });
  expect(nameInput).toHaveValue('Direction Autonomie');
  expect(nameInput).toHaveAttribute('readonly');
  expect(nameInput).not.toBeDisabled();
  expect(abbreviationInput).toHaveValue('DA');
  expect(abbreviationInput).toHaveAttribute('readonly');
  expect(abbreviationInput).not.toBeDisabled();
  expect(screen.queryByRole('textbox', { name: /Nom de la direction \(obligatoire\)/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Abréviation \(obligatoire\)/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('group', { name: 'Informations de contact pour l’usager' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Adresse e-mail de contact/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Numéro de téléphone/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Adresse postale/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: /Actif dans SIRENA/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Annuler' })).toHaveAttribute('href', '/admin/directions-services');
  expect(document.title).toBe('Modifier la direction Direction Autonomie - Directions et services - SIRENA');
});

it('does not validate read-only Direction identity during notification e-mail edits', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockResolvedValueOnce({ id: directionTarget.id });
  renderTarget({ ...directionTarget, nomComplet: '', label: '' });

  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() => expect(editMutateAsyncSpy).toHaveBeenCalledOnce());
  expect(screen.queryByText(/Le champ "Nom de la direction" est vide/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Le champ "Abréviation" est vide/)).not.toBeInTheDocument();
});

it('saves only the editable Direction notification e-mail before returning to the list', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockResolvedValueOnce({ id: directionTarget.id });
  renderTarget(directionTarget);

  const notificationEmail = screen.getByRole('textbox', { name: /Adresse e-mail de notification/ });
  await user.clear(notificationEmail);
  await user.type(notificationEmail, 'new-notification@ars.fr');
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() =>
    expect(editMutateAsyncSpy).toHaveBeenCalledWith({
      id: directionTarget.id,
      input: {
        email: 'new-notification@ars.fr',
      },
    }),
  );
  expect(addToastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Direction modifiée avec succès' }));
  expect(routerNavigateSpy).toHaveBeenCalledWith({ to: '/admin/directions-services' });
});

it('renders a Service with its current Direction and identity read-only', () => {
  renderTarget(serviceTarget);

  expect(screen.getByRole('heading', { name: 'Modifier le service Service PA' })).toBeInTheDocument();
  const direction = screen.getByRole('textbox', { name: /Direction \(obligatoire\)/ });
  const serviceName = screen.getByRole('textbox', { name: /^Nom du service/ });
  const abbreviation = screen.getByRole('textbox', { name: /^Abréviation/ });
  expect(direction).toHaveValue('Direction Autonomie (DA)');
  expect(direction).toHaveAttribute('readonly');
  expect(direction).not.toBeDisabled();
  expect(serviceName).toHaveValue('Service PA');
  expect(serviceName).toHaveAttribute('readonly');
  expect(serviceName).not.toBeDisabled();
  expect(abbreviation).toHaveValue('PA');
  expect(abbreviation).toHaveAttribute('readonly');
  expect(abbreviation).not.toBeDisabled();
  expect(screen.queryByRole('textbox', { name: /Nom du service \(obligatoire\)/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Abréviation \(obligatoire\)/ })).not.toBeInTheDocument();
  expect(direction.compareDocumentPosition(serviceName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole('group', { name: 'Informations de contact pour l’usager' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Adresse e-mail de contact/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Numéro de téléphone/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Adresse postale/ })).not.toBeInTheDocument();
  expect(document.title).toBe('Modifier le service Service PA - Directions et services - SIRENA');
});

it('saves only the Service notification e-mail without status or replacement Direction', async () => {
  const user = userEvent.setup();
  editMutateAsyncSpy.mockResolvedValueOnce({ id: serviceTarget.id });
  renderTarget(serviceTarget);

  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  await waitFor(() =>
    expect(editMutateAsyncSpy).toHaveBeenCalledWith({
      id: serviceTarget.id,
      input: {
        email: serviceTarget.email,
      },
    }),
  );
});

it('rejects an invalid Service notification e-mail before saving an edit', async () => {
  const user = userEvent.setup();
  renderTarget({ ...serviceTarget, email: '' });
  const notificationEmail = screen.getByRole('textbox', { name: /Adresse e-mail de notification/ });

  await user.type(notificationEmail, 'adresse@invalide');
  await user.click(screen.getByRole('button', { name: 'Valider les modifications' }));

  expect(notificationEmail).toHaveFocus();
  expect(screen.getByText(/L’adresse e-mail est invalide/)).toBeInTheDocument();
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
