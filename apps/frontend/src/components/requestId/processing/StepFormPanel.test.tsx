import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES } from '@sirena/common/constants';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StepFormPanel, type StepFormPanelRef } from './StepFormPanel';

const addMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();
const uploadMutateAsync = vi.fn();

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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  clotureEffectiveDate: null,
  clotureReason: [],
  createdBy: { prenom: 'cam', nom: 'd' },
  notes: [],
  uploadedFiles: [],
  editable: true,
  canOnlyEditNotes: false,
  requete: { dematSocialId: null, createdById: 'u1', thirdPartyAccountId: null, createdBy: null },
  ...overrides,
});

describe('StepFormPanel', () => {
  beforeEach(() => {
    addMutateAsync.mockReset().mockResolvedValue({ data: {} });
    updateMutateAsync.mockReset().mockResolvedValue({ data: {} });
    deleteMutateAsync.mockReset().mockResolvedValue(undefined);
    uploadMutateAsync.mockReset().mockResolvedValue({ id: 'file-1' });
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

    // Name and deletion stay locked (acknowledgment = system step)...
    expect(screen.getByLabelText("Nom de l'étape (obligatoire)")).toBeDisabled();
    expect(screen.queryByRole('button', { name: "Supprimer l'étape" })).not.toBeInTheDocument();
    // ...but status and date remain editable since the AR has not been sent.
    expect(screen.getByLabelText('Fait')).toBeEnabled();
    expect(screen.getByLabelText('À faire')).toBeEnabled();
  });
});
