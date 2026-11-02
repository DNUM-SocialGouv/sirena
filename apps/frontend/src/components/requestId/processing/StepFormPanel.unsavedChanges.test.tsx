import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDsfrModalNatively, mockDsfrModals, renderWithRouter } from '@/test-utils/renderWithRouter';
import { StepFormPanel, type StepFormPanelRef } from './StepFormPanel';

vi.mock('@/hooks/mutations/updateProcessingStep.hook', () => ({
  useAddProcessingStep: () => ({ mutateAsync: vi.fn() }),
  useUpdateProcessingStep: () => ({ mutateAsync: vi.fn() }),
  useDeleteProcessingStep: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@sirena/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sirena/ui')>();

  return { ...original, Toast: { ...original.Toast, useToastManager: () => ({ add: vi.fn() }) } };
});

const NOM_LABEL = "Nom de l'étape (obligatoire)";

// Stands for the « Traitement » tab, which drives the panel through its ref.
const TraitementTab = () => {
  const panelRef = useRef<StepFormPanelRef>(null);
  const handleAddStep = () => panelRef.current?.openCreate();

  return (
    <>
      <button type="button" onClick={handleAddStep}>
        Ajouter une étape
      </button>
      <StepFormPanel ref={panelRef} requestId="req-1" />
    </>
  );
};

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

const openPanelWithANewStep = async (user: ReturnType<typeof userEvent.setup>) => {
  await renderWithRouter(<TraitementTab />);
  await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
  await user.type(screen.getByLabelText(NOM_LABEL), 'Relance');
};

// The panel unmounts once its closing animation is over.
const expectPanelClosed = () => waitFor(() => expect(screen.queryByLabelText(NOM_LABEL)).not.toBeInTheDocument());

beforeEach(() => {
  mockDsfrModals();
});

afterEach(() => {
  cleanup();
});

describe('StepFormPanel unsaved changes', () => {
  it('asks for confirmation before Fermer closes a panel with unsaved changes', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
    expect(screen.getByLabelText(NOM_LABEL)).toHaveValue('Relance');
  });

  it('asks for confirmation before Escape closes a panel with unsaved changes', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.keyboard('{Escape}');

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
    expect(screen.getByLabelText(NOM_LABEL)).toHaveValue('Relance');
  });

  it('keeps the panel open with the input when the user chooses Annuler in the modal', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    expect(screen.getByLabelText(NOM_LABEL)).toHaveValue('Relance');
  });

  // The DSFR closes its modal on Escape, and the panel listens to Escape on the whole document too.
  it('keeps the panel open when the user leaves the modal with Escape', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    within(dialog).getByRole('button', { name: 'Annuler' }).focus();
    const closeLikeTheDsfr = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDsfrModalNatively(dialog);
    };
    document.addEventListener('keydown', closeLikeTheDsfr, { capture: true });
    await user.keyboard('{Escape}');
    document.removeEventListener('keydown', closeLikeTheDsfr, { capture: true });

    expect(unsavedChangesDialog()).not.toBeInTheDocument();
    expect(screen.getByLabelText(NOM_LABEL)).toHaveValue('Relance');

    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('closes the panel and empties it when the user chooses Quitter sans enregistrer', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Quitter sans enregistrer' }));

    await expectPanelClosed();
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    expect(screen.getByLabelText(NOM_LABEL)).toHaveValue('');
  });

  it('closes the panel without confirmation when the user clicks its Annuler', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    await expectPanelClosed();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('closes a panel without changes right away', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<TraitementTab />);
    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));

    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    await expectPanelClosed();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });
});
