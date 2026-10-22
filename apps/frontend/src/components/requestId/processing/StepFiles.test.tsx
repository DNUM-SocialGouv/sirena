import { fireEvent, render, screen, within } from '@testing-library/react';
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

  it('lists the files so assistive technologies announce how many there are', () => {
    render(
      <StepFiles
        stepId="s"
        files={[makeFile({ id: 'a', fileName: 'a.pdf' }), makeFile({ id: 'b', fileName: 'b.pdf' })]}
      />,
    );

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[1]).getByText('b.pdf')).toBeInTheDocument();
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

  it('labels a file without an uploader with its date only when the uploader is anonymous', () => {
    render(
      <StepFiles
        stepId="s"
        unknownUploader="anonymous"
        files={[makeFile({ createdAt: '2026-05-20T10:00:00.000Z', uploadedBy: null })]}
      />,
    );

    expect(screen.getByText(/Fichier ajouté le/)).toHaveTextContent(/^\s*Fichier ajouté le 20\/05\/2026$/);
    expect(screen.queryByText(/automatiquement/)).not.toBeInTheDocument();
  });

  it('shows no delete button without a delete action', () => {
    render(<StepFiles stepId="s" files={[makeFile({ fileName: 'a.pdf' })]} />);

    expect(screen.queryByRole('button', { name: /Supprimer le fichier/ })).not.toBeInTheDocument();
  });

  it('shows no delete button on a file the server keeps (canDelete false)', () => {
    render(
      <StepFiles
        stepId="s"
        onRequestDelete={vi.fn()}
        files={[makeFile({ id: 'ar', fileName: 'AR.pdf', canDelete: false }), makeFile({ id: 'b', fileName: 'b.pdf' })]}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Supprimer le fichier AR.pdf' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer le fichier b.pdf' })).toBeInTheDocument();
  });

  it('requests the deletion of the clicked file', () => {
    const onRequestDelete = vi.fn();
    render(
      <StepFiles
        stepId="s"
        onRequestDelete={onRequestDelete}
        files={[makeFile({ id: 'a', fileName: 'a.pdf' }), makeFile({ id: 'b', fileName: 'b.pdf' })]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le fichier b.pdf' }));

    expect(onRequestDelete).toHaveBeenCalledExactlyOnceWith('b', 'b.pdf');
  });
});
