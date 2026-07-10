import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StepFiles } from './StepFiles';

vi.mock('@/components/common/FileDownloadLink', () => ({
  FileDownloadLink: ({ fileName }: { fileName: string }) => <a href="#test">{fileName}</a>,
}));

type StepFile = React.ComponentProps<typeof StepFiles>['files'][number];

const makeFile = (overrides: Partial<StepFile> = {}): StepFile => ({
  id: 'f',
  size: 1,
  fileName: 'f.pdf',
  status: 'READY',
  scanStatus: 'CLEAN',
  sanitizeStatus: 'COMPLETED',
  canDelete: true,
  createdAt: '2026-05-19T10:00:00.000Z',
  uploadedBy: { prenom: 'jeanne', nom: 'Moulon' },
  ...overrides,
});

describe('StepFiles', () => {
  it('renders each file as its own card', () => {
    render(
      <StepFiles
        stepId="s"
        files={[makeFile({ id: 'a', fileName: 'a.pdf' }), makeFile({ id: 'b', fileName: 'b.pdf' })]}
      />,
    );

    expect(screen.getAllByText(/Fichier ajouté/)).toHaveLength(2);
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  it('labels a user-uploaded file with its author', () => {
    render(<StepFiles stepId="s" files={[makeFile({ canDelete: true })]} />);

    expect(screen.getByText(/Fichier ajouté le 19\/05\/2026 par/)).toBeInTheDocument();
  });

  it('labels a manually-sent AR (an uploader is recorded) with its sender', () => {
    render(
      <StepFiles
        stepId="s"
        files={[
          makeFile({
            canDelete: false,
            createdAt: '2026-05-20T10:00:00.000Z',
            uploadedBy: { prenom: 'jeanne', nom: 'Moulon' },
          }),
        ]}
      />,
    );

    expect(screen.getByText(/Fichier ajouté le 20\/05\/2026 par/)).toBeInTheDocument();
  });

  it('labels a file without an uploader as automatic', () => {
    render(
      <StepFiles
        stepId="s"
        files={[makeFile({ canDelete: false, createdAt: '2026-05-20T10:00:00.000Z', uploadedBy: null })]}
      />,
    );

    expect(screen.getByText(/Fichier ajouté automatiquement le 20\/05\/2026/)).toBeInTheDocument();
  });
});
