import { Toast } from '@sirena/ui';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequeteFileUploadSection } from './RequeteFileUploadSection';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@codegouvfr/react-dsfr/Modal', () => ({
  createModal: () => ({
    id: 'modal',
    open: vi.fn(),
    close: vi.fn(),
    Component: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }),
}));

vi.mock('@/hooks/useCanEdit', () => ({
  useCanEdit: () => ({ canEdit: true }),
}));

vi.mock('@/hooks/useModalFocusRestore', () => ({
  useModalFocusRestore: () => ({ registerTrigger: vi.fn() }),
}));

vi.mock('@/hooks/useFileProcessingStatus', () => ({
  useFileProcessingStatus: ({ initialStatus }: { initialStatus: unknown }) => initialStatus,
}));

vi.mock('@/hooks/mutations/createRequeteEntite.hook', () => ({
  useCreateRequeteEntite: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/mutations/setRequeteFile.hook', () => ({
  useSetRequeteFile: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/hooks/mutations/updateUploadedFiles.hook', () => ({
  useUploadFile: () => ({ mutateAsync: vi.fn() }),
  useDeleteUploadedFile: () => ({ mutateAsync: vi.fn() }),
}));

const file = {
  id: 'file-1',
  fileName: 'rapport-inspection.pdf',
  filePath: '/uploads/rapport-inspection.pdf',
  mimeType: 'application/pdf',
  size: 2 * 1024 * 1024,
  canDelete: true,
  status: 'COMPLETED',
  scanStatus: 'CLEAN',
  sanitizeStatus: 'NOT_APPLICABLE',
};

const renderSection = () =>
  render(
    <Toast.Provider>
      <RequeteFileUploadSection requeteId="req-1" existingFiles={[file]} />
    </Toast.Provider>,
  );

describe('RequeteFileUploadSection', () => {
  it('names the attached file and its size on the download link', () => {
    renderSection();

    expect(screen.getByRole('link', { name: /rapport-inspection\.pdf \(2\.00 Mo\)/ })).toBeInTheDocument();
  });

  it('does not repeat the type and size below the download link', () => {
    renderSection();

    expect(screen.queryByText('PDF – 2.00 Mo')).not.toBeInTheDocument();
  });
});
