import type { SituationData } from '@sirena/common/schemas';
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDsfrModals, OTHER_PAGE_HEADING, OTHER_PAGE_LINK, renderWithRouter } from '@/test-utils/renderWithRouter';
import { SituationForm } from './SituationForm';

vi.mock('@/hooks/queries/entites.hook', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/queries/entites.hook')>();

  return {
    ...original,
    useEntites: () => ({
      data: {
        data: [
          { id: 'top', nomComplet: 'ARS Normandie' },
          { id: 'other', nomComplet: "Conseil départemental de l'Eure" },
        ],
      },
    }),
    useEntiteDescendants: () => ({ data: [], isLoading: false }),
  };
});
vi.mock('@/hooks/queries/profile.hook', () => ({
  useProfile: () => ({ data: { entiteId: 'top', topEntiteId: 'top' } }),
}));
vi.mock('@/hooks/useFileStatusSSE', () => ({ useFileStatusSSE: () => ({ isConnected: false }) }));
vi.mock('@/lib/api/fetchAddresses', () => ({ fetchAddresses: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/api/fetchOrganizations', () => ({ fetchOrganizations: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/api/fetchPractitioners', () => ({ fetchPractitioners: vi.fn().mockResolvedValue([]) }));

// The server also sends the entity that uploaded the file: only its own files can be deleted.
const PHOTO = { id: 'file-1', fileName: 'photo.png', size: 10, entiteId: 'top' };

const SAVED_SITUATION: SituationData = {
  fait: { commentaire: 'Chute dans le couloir', fileIds: [PHOTO.id], files: [PHOTO] },
  traitementDesFaits: { entites: [{ entiteId: 'top' }, { entiteId: 'other' }] },
};

const renderForm = (props: Partial<ComponentProps<typeof SituationForm>> = {}) =>
  renderWithRouter(
    <SituationForm
      mode="edit"
      requestId="req-1"
      situationId="sit-1"
      initialData={SAVED_SITUATION}
      onSave={vi.fn()}
      {...props}
    />,
  );

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

const leave = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
};

const expectConfirmation = async () => {
  expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
};

const expectLeftWithoutConfirmation = async () => {
  expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  expect(unsavedChangesDialog()).not.toBeInTheDocument();
};

beforeEach(() => {
  mockDsfrModals();
});

afterEach(() => {
  cleanup();
});

describe('SituationForm unsaved changes', () => {
  it('asks for confirmation when the user leaves after changing a field', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.type(screen.getByLabelText(/^Explication des faits par le déclarant/), ' grave');
    await leave(user);

    await expectConfirmation();
  });

  it.each([
    { mode: 'edit' as const, initialData: SAVED_SITUATION },
    { mode: 'create' as const, initialData: undefined },
  ])('lets the user leave an untouched form in $mode mode without confirmation', async ({ mode, initialData }) => {
    const user = userEvent.setup();
    await renderForm({ mode, initialData, requestId: mode === 'edit' ? 'req-1' : undefined });

    await leave(user);

    await expectLeftWithoutConfirmation();
  });

  it('asks for confirmation when the user leaves with a file selected for upload', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.upload(
      screen.getByLabelText(/^Ajouter des fichiers relatifs aux faits/),
      new File(['x'], 'courrier.pdf', { type: 'application/pdf' }),
    );
    await leave(user);

    await expectConfirmation();
  });

  it('asks for confirmation when the user leaves after removing an existing file', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('button', { name: 'Supprimer le fichier photo.png' }));
    const deleteDialog = await screen.findByRole('dialog', { name: 'Supprimer le fichier' });
    await user.click(within(deleteDialog).getByRole('button', { name: 'Confirmer' }));
    await leave(user);

    await expectConfirmation();
  });

  it('asks for confirmation when the user leaves after removing an entity in charge', async () => {
    const user = userEvent.setup();
    await renderForm();

    await user.click(screen.getByRole('button', { name: 'Supprimer cette entité' }));
    await leave(user);

    await expectConfirmation();
  });

  it('still asks for confirmation after a save that did not go through', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    await renderForm({ onSave });

    await user.type(screen.getByLabelText(/^Explication des faits par le déclarant/), ' grave');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(onSave).toHaveBeenCalledOnce();
    await leave(user);

    await expectConfirmation();
  });

  it.each([
    { mode: 'edit' as const, requestId: 'req-1', destination: '/request/req-1' },
    { mode: 'create' as const, requestId: undefined, destination: '/request/create' },
  ])(
    'discards the changes without confirmation when the user clicks the form’s Annuler in $mode mode',
    async ({ mode, requestId, destination }) => {
      const user = userEvent.setup();
      const router = await renderForm({ mode, requestId });

      await user.type(screen.getByLabelText(/^Explication des faits par le déclarant/), ' grave');
      await user.click(screen.getByRole('button', { name: 'Annuler' }));

      await expectLeftWithoutConfirmation();
      expect(router.state.location.pathname).toBe(destination);
    },
  );
});

// After a successful save the route may keep the agent on the form, when they close the close request modal.
describe('SituationForm after a successful save that stays on the form', () => {
  const renderWithSaves = async () => {
    let markSaved: () => void = () => {};

    const WithSaves = () => {
      const [savedVersion, setSavedVersion] = useState(0);
      markSaved = () => setSavedVersion((version) => version + 1);

      return (
        <SituationForm
          mode="edit"
          requestId="req-1"
          situationId="sit-1"
          initialData={SAVED_SITUATION}
          savedVersion={savedVersion}
          onSave={vi.fn()}
        />
      );
    };

    await renderWithRouter(<WithSaves />);

    return () => act(() => markSaved());
  };

  it('lets the user leave without confirmation, uploaded files included', async () => {
    const user = userEvent.setup();
    const saveSucceeded = await renderWithSaves();

    await user.type(screen.getByLabelText(/^Explication des faits par le déclarant/), ' grave');
    await user.upload(
      screen.getByLabelText(/^Ajouter des fichiers relatifs aux faits/),
      new File(['x'], 'courrier.pdf', { type: 'application/pdf' }),
    );
    saveSucceeded();
    await leave(user);

    await expectLeftWithoutConfirmation();
  });

  it('asks for confirmation again after a later change', async () => {
    const user = userEvent.setup();
    const saveSucceeded = await renderWithSaves();

    await user.type(screen.getByLabelText(/^Explication des faits par le déclarant/), ' grave');
    saveSucceeded();
    await user.type(screen.getByLabelText(/^Explication des faits par le déclarant/), ' et répétée');
    await leave(user);

    await expectConfirmation();
  });
});
