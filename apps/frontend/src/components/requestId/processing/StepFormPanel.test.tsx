import { REQUETE_ETAPE_RAPPEL_TYPES, REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES } from '@sirena/common/constants';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { StepFormPanel, type StepFormPanelRef } from './StepFormPanel';

const addMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();
const uploadMutateAsync = vi.fn();
const EST_PARTAGEE_REQUIRED_ERROR =
  'Le champ "Afficher l’étape pour les autres entités affectées" est obligatoire. Veuillez sélectionner une option pour ajouter une étape.';

vi.mock('@/hooks/mutations/updateProcessingStep.hook', () => ({
  useAddProcessingStep: () => ({ mutateAsync: addMutateAsync }),
  useUpdateProcessingStep: () => ({ mutateAsync: updateMutateAsync }),
  useDeleteProcessingStep: () => ({ mutateAsync: deleteMutateAsync }),
}));

vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({ mutateAsync: uploadMutateAsync }),
}));

vi.mock('@/components/common/FileDownloadLink', () => ({
  FileDownloadLink: ({ fileName }: { fileName: string }) => <span>{fileName}</span>,
}));

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: () => ({
    id: 'step-form-panel-delete',
    open: vi.fn(),
    close: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: minimal modal mock
    Component: ({ children, buttons }: any) => (
      <div>
        {children}
        {/* biome-ignore lint/suspicious/noExplicitAny: minimal modal mock */}
        {buttons?.map((b: any) => (
          <button key={b.children} type="button" onClick={b.onClick}>
            {b.children}
          </button>
        ))}
      </div>
    ),
  }),
}));

vi.mock('@sirena/ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sirena/ui')>();
  return {
    ...original,
    Toast: { ...original.Toast, useToastManager: () => ({ add: vi.fn() }) },
  };
});

// biome-ignore lint/suspicious/noExplicitAny: minimal step shape for tests
const makeStep = (overrides: Record<string, any> = {}): any => ({
  id: 'step-1',
  requeteId: 'REQ-1',
  entiteId: 'ENT-1',
  nom: 'Relance',
  type: REQUETE_ETAPE_TYPES.MANUAL,
  statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
  dateRealisation: null,
  rappelType: null,
  rappelDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  clotureEffectiveDate: null,
  estPartagee: false,
  clotureReason: [],
  createdBy: { prenom: 'cam', nom: 'd' },
  notes: [],
  uploadedFiles: [],
  editable: true,
  canOnlyEditNotes: false,
  requete: { dematSocialId: null, createdById: 'u1', thirdPartyAccountId: null, createdBy: null },
  ...overrides,
});

const markAsBadInput = (element: HTMLElement) => {
  Object.defineProperty(element, 'validity', {
    value: { badInput: true },
    configurable: true,
  });
};

describe('StepFormPanel', () => {
  beforeEach(() => {
    addMutateAsync.mockReset().mockResolvedValue({ data: {} });
    updateMutateAsync.mockReset().mockResolvedValue({ data: {} });
    deleteMutateAsync.mockReset().mockResolvedValue(undefined);
    uploadMutateAsync.mockReset().mockResolvedValue({ id: 'file-1' });
    useFeatureFlagStore.getState().reset();
    useFeatureFlagStore.getState().setFlags({ ETAPE_RAPPEL: true });
  });

  it('creates a step with no status selected by default (spec)', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openCreate());

    fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), {
      target: { value: 'Nouvelle étape' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(addMutateAsync).toHaveBeenCalledTimes(1);
    expect(addMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ nom: 'Nouvelle étape', fileIds: [] }));
    expect(addMutateAsync.mock.calls[0][0].statutId).toBeUndefined();
  });

  it('requires an explicit sharing choice when enabled, focuses the radio group, and sends the choice', async () => {
    useFeatureFlagStore.getState().setFlags({ SHARED_PROCESSING_STEPS: true });
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openCreate());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), {
      target: { value: 'Étape partagée' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(addMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(EST_PARTAGEE_REQUIRED_ERROR)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Afficher l’étape/ })).toHaveAccessibleName(
      expect.stringContaining(EST_PARTAGEE_REQUIRED_ERROR),
    );
    expect(document.activeElement).toBe(screen.getByLabelText('Oui'));

    fireEvent.click(screen.getByLabelText('Oui'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(addMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ estPartagee: true }));
  });

  it('prefills and updates the persisted sharing choice when editing', async () => {
    useFeatureFlagStore.getState().setFlags({ SHARED_PROCESSING_STEPS: true });
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openEdit(makeStep({ estPartagee: false })));

    expect(screen.getByLabelText('Non')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Oui'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(updateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ estPartagee: true }));
  });

  it('hides sharing controls and omits the value when the feature is disabled', () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openCreate());

    expect(screen.queryByText(/Afficher l’étape pour les autres entités affectées/)).not.toBeInTheDocument();
  });

  it('sends statut and date when « Fait » is selected', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openCreate());

    fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), {
      target: { value: 'Étape faite' },
    });
    fireEvent.click(screen.getByLabelText('Fait'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(addMutateAsync).toHaveBeenCalledTimes(1);
    const payload = addMutateAsync.mock.calls[0][0];
    expect(payload.statutId).toBe(REQUETE_ETAPE_STATUT_TYPES.FAIT);
    expect(payload.dateRealisation).toBeTruthy();
  });

  it('blocks creation with an inline message when « Fait le » holds an incomplete date', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openCreate());

    fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), {
      target: { value: 'Étape faite' },
    });
    fireEvent.click(screen.getByLabelText('Fait'));
    markAsBadInput(screen.getByLabelText(/Fait le/));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(addMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Fait le/)).toHaveAccessibleDescription(
      /« Fait le » est incomplet ou contient une date non valide\. Format attendu : JJ-MM-AAAA\./,
    );
  });

  it('blocks creation when the name is empty', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openCreate());
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(addMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/Veuillez le renseigner pour ajouter une étape/)).toBeInTheDocument();
  });

  it('prefills the edit form and renders system notes as read-only', () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() =>
      ref.current?.openEdit(
        makeStep({
          nom: 'Étape à modifier',
          notes: [
            {
              id: 'n1',
              texte: 'Note agent',
              createdAt: '2026-01-02T00:00:00.000Z',
              uploadedFiles: [],
              author: { prenom: 'a', nom: 'b' },
            },
            { id: 'n2', texte: 'Note système', createdAt: '2026-01-02T00:00:00.000Z', uploadedFiles: [], author: null },
          ],
        }),
      ),
    );

    expect(screen.getByDisplayValue('Étape à modifier')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Note agent')).toBeInTheDocument();
    expect(screen.getByText('Note système')).toBeInTheDocument();
    expect(screen.getByText(/Note du 02-01-2026 \(lecture seule\)/)).toBeInTheDocument();
  });

  it('shows a "Notes" heading in edit mode, even with no notes, so the add-note button is not tied to the status section', () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openEdit(makeStep({ notes: [] })));

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter une note' })).toBeInTheDocument();
  });

  it('moves focus into the new note textarea when adding a note', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openEdit(makeStep({ notes: [] })));
    // Let the panel's open-focus (heading) settle first, as it does in the real app.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Ajouter une note' }));
    });

    // Focus lands in the note textarea, not on the add-note button.
    expect(document.activeElement?.tagName).toBe('TEXTAREA');
  });

  it('removes an editable note via its delete button', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() =>
      ref.current?.openEdit(
        makeStep({
          notes: [
            {
              id: 'n1',
              texte: 'Note agent',
              createdAt: '2026-01-02T00:00:00.000Z',
              uploadedFiles: [],
              author: { prenom: 'a', nom: 'b' },
            },
          ],
        }),
      ),
    );

    expect(screen.getByDisplayValue('Note agent')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /supprimer la note du 02-01-2026/i }));
    });
    expect(screen.queryByDisplayValue('Note agent')).not.toBeInTheDocument();
  });

  it('sends the full desired state on edit (nom, statut, note id, fileIds)', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() =>
      ref.current?.openEdit(
        makeStep({
          nom: 'Étape à modifier',
          statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
          notes: [
            {
              id: 'n1',
              texte: 'Note agent',
              createdAt: '2026-01-02T00:00:00.000Z',
              uploadedFiles: [],
              author: { prenom: 'a', nom: 'b' },
            },
          ],
          uploadedFiles: [{ id: 'f1', fileName: 'doc.pdf', size: 10, canDelete: true }],
        }),
      ),
    );

    fireEvent.change(screen.getByDisplayValue('Étape à modifier'), { target: { value: 'Nouveau nom' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    });

    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
    const payload = updateMutateAsync.mock.calls[0][0];
    expect(payload.id).toBe('step-1');
    expect(payload.nom).toBe('Nouveau nom');
    expect(payload.statutId).toBe(REQUETE_ETAPE_STATUT_TYPES.A_FAIRE);
    expect(payload.notes).toEqual([{ id: 'n1', texte: 'Note agent' }]);
    expect(payload.fileIds).toEqual(['f1']);
  });

  it('deletes the step from the drawer', async () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() => ref.current?.openEdit(makeStep()));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    });

    expect(deleteMutateAsync).toHaveBeenCalledWith({ id: 'step-1' });
  });

  it('locks status/name but allows notes and attachments for an ACR step (canOnlyEditNotes)', () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() =>
      ref.current?.openEdit(
        makeStep({
          type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
          statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
          dateRealisation: '2026-05-20T00:00:00.000Z',
          canOnlyEditNotes: true,
        }),
      ),
    );

    expect(
      screen.getByText('Information : cette étape sera visible par les autres entités affectées.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Afficher l’étape pour les autres entités affectées/)).not.toBeInTheDocument();
    // Step metadata stays locked...
    expect(screen.getByLabelText("Nom de l'étape (obligatoire)")).toBeDisabled();
    expect(screen.getByLabelText('Fait')).toBeDisabled();
    expect(screen.getByLabelText('À faire')).toBeDisabled();
    // ...but notes and attachments can still be added.
    expect(screen.getByText('Sélectionner un fichier')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter une note' })).toBeInTheDocument();
  });

  it('locks name and hides delete but keeps status editable for a not-yet-sent ACR step', () => {
    const ref = createRef<StepFormPanelRef>();
    render(<StepFormPanel ref={ref} requestId="REQ-1" />);

    act(() =>
      ref.current?.openEdit(
        makeStep({
          type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
          statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
          dateRealisation: '2026-05-20T00:00:00.000Z',
          canOnlyEditNotes: false, // AR marked "Fait" by hand — no AR PDF, not sent
        }),
      ),
    );

    expect(
      screen.getByText('Information : cette étape sera visible par les autres entités affectées.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Afficher l’étape pour les autres entités affectées/)).not.toBeInTheDocument();
    // Name and deletion stay locked (acknowledgment = system step)...
    expect(screen.getByLabelText("Nom de l'étape (obligatoire)")).toBeDisabled();
    expect(screen.queryByRole('button', { name: "Supprimer l'étape" })).not.toBeInTheDocument();
    // ...but status and date remain editable since the AR has not been sent.
    expect(screen.getByLabelText('Fait')).toBeEnabled();
    expect(screen.getByLabelText('À faire')).toBeEnabled();
  });

  describe('rappel', () => {
    const getRappelSelect = () =>
      screen.getByLabelText('Mettre un rappel pour cette étape (alertes, relances etc.)') as HTMLSelectElement;

    it('defaults to « Désactivé » and hides the custom date field', () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() => ref.current?.openCreate());

      expect(getRappelSelect().value).toBe('');
      expect(screen.queryByLabelText(/Rappeler cette étape le/)).not.toBeInTheDocument();
    });

    it('sends the selected delay without a date, letting the server compute the due date', async () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() => ref.current?.openCreate());

      fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), { target: { value: 'Relance' } });
      fireEvent.change(getRappelSelect(), { target: { value: REQUETE_ETAPE_RAPPEL_TYPES.JOURS_15 } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
      });

      const payload = addMutateAsync.mock.calls[0][0];
      expect(payload.rappelType).toBe(REQUETE_ETAPE_RAPPEL_TYPES.JOURS_15);
      expect(payload.rappelDate).toBeUndefined();
    });

    it('shows the custom date field when « Date personnalisée » is selected', () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() => ref.current?.openCreate());
      fireEvent.change(getRappelSelect(), { target: { value: REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE } });

      expect(screen.getByLabelText(/Rappeler cette étape le/)).toBeInTheDocument();
    });

    it('blocks saving when « Date personnalisée » is selected without a date', async () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() => ref.current?.openCreate());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), { target: { value: 'Relance' } });
      fireEvent.change(getRappelSelect(), { target: { value: REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
      });

      expect(addMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Rappeler cette étape le/)).toHaveAccessibleDescription(
        /« Rappeler cette étape le » est obligatoire/,
      );
      expect(document.activeElement).toBe(screen.getByLabelText(/Rappeler cette étape le/));
    });

    it('blocks saving with an inline message when the custom date is incomplete', async () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() => ref.current?.openCreate());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), { target: { value: 'Relance' } });
      fireEvent.change(getRappelSelect(), { target: { value: REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE } });
      markAsBadInput(screen.getByLabelText(/Rappeler cette étape le/));
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
      });

      expect(addMutateAsync).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Rappeler cette étape le/)).toHaveAccessibleDescription(
        /« Rappeler cette étape le » est incomplet ou contient une date non valide\. Format attendu : JJ-MM-AAAA\./,
      );
      expect(document.activeElement).toBe(screen.getByLabelText(/Rappeler cette étape le/));
    });

    it('sends the custom date when one is filled in', async () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() => ref.current?.openCreate());
      fireEvent.change(screen.getByLabelText("Nom de l'étape (obligatoire)"), { target: { value: 'Relance' } });
      fireEvent.change(getRappelSelect(), { target: { value: REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE } });
      fireEvent.change(screen.getByLabelText(/Rappeler cette étape le/), {
        target: { value: '2026-09-01' },
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
      });

      const payload = addMutateAsync.mock.calls[0][0];
      expect(payload.rappelType).toBe(REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE);
      expect(payload.rappelDate).toBe('2026-09-01');
    });

    it('prefills an existing reminder in edit mode', () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() =>
        ref.current?.openEdit(
          makeStep({ rappelType: REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE, rappelDate: '2026-09-01T00:00:00.000Z' }),
        ),
      );

      expect(getRappelSelect().value).toBe(REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE);
      expect(screen.getByLabelText(/Rappeler cette étape le/)).toHaveValue('2026-09-01');
    });

    it('locks the reminder on a sent acknowledgment step', () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() =>
        ref.current?.openEdit(
          makeStep({ type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT, statutId: 'FAIT', canOnlyEditNotes: true }),
        ),
      );

      expect(getRappelSelect()).toBeDisabled();
    });

    it('disables an existing reminder when « Désactivé » is selected back', async () => {
      const ref = createRef<StepFormPanelRef>();
      render(<StepFormPanel ref={ref} requestId="REQ-1" />);

      act(() => ref.current?.openEdit(makeStep({ rappelType: REQUETE_ETAPE_RAPPEL_TYPES.JOURS_30 })));
      fireEvent.change(getRappelSelect(), { target: { value: '' } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
      });

      const payload = updateMutateAsync.mock.calls[0][0];
      expect(payload.rappelType).toBeNull();
      expect(payload.rappelDate).toBeUndefined();
    });

    describe('when the feature flag is disabled', () => {
      beforeEach(() => {
        useFeatureFlagStore.getState().setFlags({ ETAPE_RAPPEL: false });
      });

      it('hides the reminder fields', () => {
        const ref = createRef<StepFormPanelRef>();
        render(<StepFormPanel ref={ref} requestId="REQ-1" />);

        act(() => ref.current?.openCreate());

        expect(
          screen.queryByLabelText('Mettre un rappel pour cette étape (alertes, relances etc.)'),
        ).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Rappeler cette étape le/)).not.toBeInTheDocument();
      });

      it('keeps an existing reminder untouched when the step is edited', async () => {
        const ref = createRef<StepFormPanelRef>();
        render(<StepFormPanel ref={ref} requestId="REQ-1" />);

        act(() =>
          ref.current?.openEdit(
            makeStep({ rappelType: REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE, rappelDate: '2026-09-01T00:00:00.000Z' }),
          ),
        );
        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
        });

        const payload = updateMutateAsync.mock.calls[0][0];
        expect(payload.rappelType).toBe(REQUETE_ETAPE_RAPPEL_TYPES.PERSONNALISE);
        expect(payload.rappelDate).toBe('2026-09-01');
      });
    });
  });
});
