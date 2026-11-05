import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDirectionsServicesList } from '@/hooks/queries/entites.hook';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { RouteComponent as DirectionCreate } from './directions.create';
import { RouteComponent as ServiceCreate } from './services.create';

const createEntite = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/queries/entites.hook', () => ({
  useCreateDirectionAdminLocal: () => ({ mutateAsync: createEntite, isPending: false }),
  useCreateServiceAdminLocal: () => ({ mutateAsync: createEntite, isPending: false }),
  useDirectionsServicesList: vi.fn(),
}));
vi.mock('./-create-route-guard', () => ({
  requireAdminLocalDirectionCreation: vi.fn(),
  requireAdminLocalServiceCreation: vi.fn(),
}));
vi.mock('@sirena/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sirena/ui')>();

  return { ...actual, Toast: { ...actual.Toast, useToastManager: () => ({ add: vi.fn() }) } };
});

type User = ReturnType<typeof userEvent.setup>;

const fillIdentity = async (user: User) => {
  await user.type(screen.getByLabelText(/^Nom (de la direction|du service)/), 'Offre de soins');
  await user.type(screen.getByLabelText(/^Abréviation/), 'DOS');
};

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

const SCREENS: { name: string; Screen: ComponentType; path: string; submit: string }[] = [
  {
    name: 'Ajouter une direction',
    Screen: DirectionCreate,
    path: '/admin/directions-services/directions/create',
    submit: 'Ajouter la direction',
  },
  {
    name: 'Ajouter un service',
    Screen: ServiceCreate,
    path: '/admin/directions-services/services/create',
    submit: 'Ajouter le service',
  },
];

beforeEach(() => {
  mockDsfrModals();
  vi.mocked(useDirectionsServicesList).mockReturnValue({
    data: {
      capabilities: { canCreateDirection: false, canCreateService: true },
      availableDirections: [],
      serviceParentDirection: { id: 'dir-dos', nomComplet: 'Direction de l’Offre de Soins', label: 'DOS' },
    },
    isPending: false,
    isError: false,
  } as never);
  createEntite.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanup();
});

describe.each(SCREENS)('$name screen unsaved changes', ({ Screen, path, submit }) => {
  it('asks for confirmation when the admin leaves with unsaved changes', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Screen />, { formPath: path });

    await user.type(screen.getByLabelText(/^Abréviation/), 'DOS');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the admin leave an untouched screen without confirmation', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Screen />, { formPath: path });

    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  });

  it('goes back without confirmation when the admin clicks Annuler', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Screen />, { formPath: path });

    await fillIdentity(user);
    await user.click(screen.getByRole('link', { name: 'Annuler' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('goes back without confirmation once the entity is created', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Screen />, { formPath: path });

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: submit }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('still asks for confirmation after a failed creation', async () => {
    const user = userEvent.setup();
    createEntite.mockRejectedValue(new Error('network'));
    await renderWithRouter(<Screen />, { formPath: path });

    await fillIdentity(user);
    await user.click(screen.getByRole('button', { name: submit }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('still asks for confirmation after a validation error', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<Screen />, { formPath: path });

    await user.type(screen.getByLabelText(/^Abréviation/), 'DOS');
    await user.click(screen.getByRole('button', { name: submit }));
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
    expect(createEntite).not.toHaveBeenCalled();
  });
});

describe('Ajouter un service screen direction choice', () => {
  it('counts the chosen direction as an unsaved change', async () => {
    const user = userEvent.setup();
    vi.mocked(useDirectionsServicesList).mockReturnValue({
      data: {
        capabilities: { canCreateDirection: true, canCreateService: true },
        availableDirections: [{ id: 'dir-dos', nomComplet: 'Direction de l’Offre de Soins', label: 'DOS' }],
      },
      isPending: false,
      isError: false,
    } as never);
    await renderWithRouter(<ServiceCreate />, { formPath: '/admin/directions-services/services/create' });

    await user.selectOptions(screen.getByRole('combobox', { name: /^Direction/ }), 'dir-dos');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });
});
