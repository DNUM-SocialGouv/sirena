import { Toast } from '@sirena/ui';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChangesGuard } from '@/components/unsavedChanges/useUnsavedChangesGuard';
import { mockDsfrModals, OTHER_PAGE_HEADING, renderWithRouter } from '@/test-utils/renderWithRouter';
import { RequeteFileUploadSection } from './RequeteFileUploadSection';

vi.mock('@/hooks/useCanEdit', () => ({ useCanEdit: () => ({ canEdit: true }) }));
vi.mock('@/hooks/useModalFocusRestore', () => ({ useModalFocusRestore: () => ({ registerTrigger: vi.fn() }) }));
vi.mock('@/hooks/useFileProcessingStatus', () => ({
  useFileProcessingStatus: ({ initialStatus }: { initialStatus: unknown }) => initialStatus,
}));
const createRequete = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/mutations/createRequeteEntite.hook', () => ({
  useCreateRequeteEntite: () => ({ mutateAsync: createRequete }),
}));
vi.mock('@/hooks/mutations/setRequeteFile.hook', () => ({
  useSetRequeteFile: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));
vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      id: 'file-1',
      fileName: 'courrier.pdf',
      filePath: '/uploads/courrier.pdf',
      mimeType: 'application/pdf',
      size: 4,
      canDelete: true,
      status: 'PENDING',
      scanStatus: 'PENDING',
      sanitizeStatus: 'PENDING',
    }),
  }),
  useDeleteUploadedFile: () => ({ mutateAsync: vi.fn() }),
}));

const PageWithForm = () => {
  const [date, setDate] = useState('');
  useUnsavedChangesGuard({ isDirty: date !== '' });

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => setDate(event.target.value);

  return (
    <Toast.Provider>
      <label>
        Date de réception
        <input value={date} onChange={handleDateChange} />
      </label>
      <RequeteFileUploadSection mode="create" />
    </Toast.Provider>
  );
};

const renderPage = () => renderWithRouter(<PageWithForm />, { formPath: '/request/create' });

const unsavedChangesDialog = () => screen.queryByRole('dialog', { name: 'Données non enregistrées' });

const dropFile = (user: ReturnType<typeof userEvent.setup>) =>
  user.upload(
    document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement,
    new File(['%PDF'], 'courrier.pdf', { type: 'application/pdf' }),
  );

beforeEach(() => {
  mockDsfrModals();
  createRequete.mockResolvedValue({ id: 'req-new' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RequeteFileUploadSection on the creation page', () => {
  it('opens the created request without confirmation when no form of the page was changed', async () => {
    const user = userEvent.setup();
    await renderPage();

    await dropFile(user);

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(unsavedChangesDialog()).not.toBeInTheDocument();
  });

  it('asks for confirmation when another form of the page has unsaved changes', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.type(screen.getByLabelText('Date de réception'), '2026-11-03');
    await dropFile(user);

    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    expect(createRequete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Quitter sans enregistrer' }));

    expect(await screen.findByRole('heading', { name: OTHER_PAGE_HEADING })).toBeInTheDocument();
    expect(createRequete).toHaveBeenCalledOnce();
  });

  it('creates nothing and keeps the input when the user chooses Annuler', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.type(screen.getByLabelText('Date de réception'), '2026-11-03');
    await dropFile(user);
    const dialog = await screen.findByRole('dialog', { name: 'Données non enregistrées' });
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    await waitFor(() => expect(unsavedChangesDialog()).not.toBeInTheDocument());
    expect(createRequete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Date de réception')).toHaveValue('2026-11-03');
  });
});
