import { REQUETE_ETAPE_RAPPEL_TYPES, REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES } from '@sirena/common/constants';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import {
  closeDsfrModalNatively,
  mockDsfrModals,
  OTHER_PAGE_HEADING,
  OTHER_PAGE_LINK,
  renderWithRouter,
} from '@/test-utils/renderWithRouter';
import { StepFormPanel, type StepFormPanelRef } from './StepFormPanel';

const addStep = vi.hoisted(() => vi.fn());
const deleteStep = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/mutations/updateProcessingStep.hook', () => ({
  useAddProcessingStep: () => ({ mutateAsync: addStep }),
  useUpdateProcessingStep: () => ({ mutateAsync: vi.fn() }),
  useDeleteProcessingStep: () => ({ mutateAsync: deleteStep }),
}));
vi.mock('@/components/common/FileDownloadLink', () => ({
  FileDownloadLink: ({ fileName }: { fileName: string }) => <span>{fileName}</span>,
}));
vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@sirena/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sirena/ui')>();

  return { ...original, Toast: { ...original.Toast, useToastManager: () => ({ add: vi.fn() }) } };
});

const NOM_LABEL = "Nom de l'étape (obligatoire)";

type Step = Parameters<StepFormPanelRef['openEdit']>[0];

const makeStep = (overrides: Partial<Step>) =>
  ({
    requeteId: 'req-1',
    entiteId: 'ent-1',
    type: REQUETE_ETAPE_TYPES.MANUAL,
    statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
    dateRealisation: null,
    rappelType: null,
    rappelDate: null,
    estPartagee: false,
    notes: [],
    uploadedFiles: [],
    editable: true,
    canOnlyEditNotes: false,
    ...overrides,
  }) as Step;

const RELANCE = makeStep({
  id: 'step-1',
  nom: 'Relance',
  statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
  dateRealisation: '2026-01-05T00:00:00.000Z',
  notes: [
    { id: 'note-1', texte: 'Appel passé', createdAt: '2026-01-05T00:00:00.000Z', author: { prenom: 'Ada' } },
  ] as Step['notes'],
  uploadedFiles: [{ id: 'file-1', fileName: 'courrier.pdf', size: 10, canDelete: true }] as Step['uploadedFiles'],
});
const COURRIER = makeStep({ id: 'step-2', nom: 'Courrier' });

// Stands for the « Traitement » tab, which drives the panel through its ref.
const TraitementTab = () => {
  const panelRef = useRef<StepFormPanelRef>(null);
  const handleAddStep = () => panelRef.current?.openCreate();
  const handleEditRelance = () => panelRef.current?.openEdit(RELANCE);
  const handleEditCourrier = () => panelRef.current?.openEdit(COURRIER);

  return (
    <>
      <button type="button" onClick={handleAddStep}>
        Ajouter une étape
      </button>
      <button type="button" onClick={handleEditRelance}>
        Modifier Relance
      </button>
      <button type="button" onClick={handleEditCourrier}>
        Modifier Courrier
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
  useFeatureFlagStore.getState().reset();
  useFeatureFlagStore.getState().setFlags({ ETAPE_RAPPEL: true });
  addStep.mockReset().mockResolvedValue({ data: {} });
  deleteStep.mockReset().mockResolvedValue(undefined);
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

describe('StepFormPanel unsaved changes when the panel content changes', () => {
  it('asks for confirmation before Ajouter une étape replaces a step with unsaved changes', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('button', { name: 'Ajouter une étape' }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    expect(screen.getByLabelText(NOM_LABEL)).toHaveValue('Relance');
  });

  it('opens the other step once the user chooses Quitter sans enregistrer, on a fresh baseline', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<TraitementTab />);
    await user.click(screen.getByRole('button', { name: 'Modifier Relance' }));
    await user.type(screen.getByLabelText(NOM_LABEL), ' urgente');

    await user.click(screen.getByRole('button', { name: 'Modifier Courrier' }));
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Quitter sans enregistrer' }));

    expect(await screen.findByRole('heading', { name: "Modifier l'étape « Courrier »" })).toBeInTheDocument();
    expect(screen.getByLabelText(NOM_LABEL)).toHaveValue('Courrier');
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));
    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
  });

  it('asks for confirmation when the user leaves the page with unsaved changes in the panel', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the user leave an edited step they did not change without confirmation', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<TraitementTab />);
    await user.click(screen.getByRole('button', { name: 'Modifier Relance' }));

    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it.each([
    {
      change: 'a note',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.type(screen.getByRole('textbox', { name: /^Note du/ }), ' deux fois'),
    },
    {
      change: 'the status',
      act: (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByLabelText('À faire')),
    },
    {
      change: 'the completion date',
      act: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.clear(screen.getByLabelText(/^Fait le/));
        await user.type(screen.getByLabelText(/^Fait le/), '2026-01-06');
      },
    },
    {
      change: 'the reminder',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.selectOptions(screen.getByLabelText(/^Mettre un rappel/), REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE),
    },
    {
      change: 'a file selected for upload',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.upload(
          document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement,
          new File(['x'], 'photo.png', { type: 'image/png' }),
        ),
    },
    {
      change: 'an existing file removed',
      act: (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Retirer le fichier courrier.pdf' })),
    },
  ])('asks for confirmation when the user leaves after changing $change', async ({ act }) => {
    const user = userEvent.setup();
    await renderWithRouter(<TraitementTab />);
    await user.click(screen.getByRole('button', { name: 'Modifier Relance' }));

    await act(user);
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('dialog', { name: 'Données non enregistrées' })).toBeInTheDocument();
  });

  it('lets the user leave without confirmation once the step is saved', async () => {
    const user = userEvent.setup();
    await openPanelWithANewStep(user);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await expectPanelClosed();
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('lets the user leave without confirmation once the step is deleted', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<TraitementTab />);
    await user.click(screen.getByRole('button', { name: 'Modifier Relance' }));
    await user.type(screen.getByLabelText(NOM_LABEL), ' urgente');

    await user.click(screen.getByRole('button', { name: "Supprimer l'étape" }));
    const deleteDialog = await screen.findByRole('dialog', { name: "Suppression d'une étape" });
    await user.click(within(deleteDialog).getByRole('button', { name: 'Supprimer' }));
    await expectPanelClosed();
    await user.click(screen.getByRole('link', { name: OTHER_PAGE_LINK }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });
});
