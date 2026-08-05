import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FileProcessingStatus } from '@/lib/api/fetchUploadedFiles';
import { FileDownloadLink } from './FileDownloadLink';

let pushStatus: ((status: FileProcessingStatus) => void) | null = null;

vi.mock('@/hooks/useFileStatusSSE', () => ({
  useFileStatusSSE: ({ onStatusChange }: { onStatusChange?: (status: FileProcessingStatus) => void }) => {
    pushStatus = onStatusChange ?? null;
    return { isConnected: true };
  },
}));

afterEach(() => {
  cleanup();
  pushStatus = null;
  vi.clearAllMocks();
});

const renderLink = (props: { status: string; scanStatus: string; sanitizeStatus: string }) =>
  render(<FileDownloadLink href="/api/files/1" fileId="file-1" fileName="rapport.pdf" {...props} />);

describe('FileDownloadLink status badge', () => {
  it('describes the file link with its processing status', () => {
    renderLink({ status: 'READY', scanStatus: 'CLEAN', sanitizeStatus: 'COMPLETED' });

    const link = screen.getByRole('link', { name: /rapport\.pdf/ });
    const describedBy = link.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const status = document.getElementById(describedBy as string);
    expect(status).toHaveTextContent('Statut du fichier : Analysé et sécurisé');
  });

  it('keeps the same live region node when the status changes', () => {
    renderLink({ status: 'PENDING', scanStatus: 'SCANNING', sanitizeStatus: 'PENDING' });

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(within(liveRegion).getByText(/Analyse antivirus en cours/)).toBeInTheDocument();

    act(() => {
      pushStatus?.({
        id: 'file-1',
        status: 'READY',
        scanStatus: 'INFECTED',
        sanitizeStatus: 'ERROR',
        processingError: null,
        safeFilePath: null,
      });
    });

    expect(screen.getByRole('status')).toBe(liveRegion);
    expect(within(liveRegion).getByText(/Risque détecté par l'antivirus/)).toBeInTheDocument();
  });
});
