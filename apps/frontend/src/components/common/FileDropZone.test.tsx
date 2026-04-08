import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileDropZone } from './FileDropZone';

vi.mock('@codegouvfr/react-dsfr', () => ({
  fr: {
    cx: (...args: string[]) => args.join(' '),
  },
}));

const defaultProps = {
  selectedFiles: [] as File[],
  fileErrors: {},
  onFilesSelect: vi.fn(),
};

function renderDropZone(overrides = {}) {
  return render(<FileDropZone {...defaultProps} {...overrides} />);
}

function createMockFile(name: string, type = 'application/pdf'): File {
  return new File(['content'], name, { type });
}

function createDragEvent(files: File[]) {
  const dataTransfer = {
    files,
    types: ['Files'],
    items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
  };
  return { dataTransfer };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FileDropZone', () => {
  describe('rendering', () => {
    it('should render the drop zone when canEdit is true', () => {
      renderDropZone();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should not render the drop zone when canEdit is false', () => {
      renderDropZone({ canEdit: false });
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should display the empty message when no files are selected', () => {
      renderDropZone({ emptyMessage: 'Aucun fichier' });
      expect(screen.getByText('Aucun fichier')).toBeInTheDocument();
    });

    it('should hide the empty message when files are selected', () => {
      renderDropZone({
        selectedFiles: [createMockFile('test.pdf')],
        emptyMessage: 'Aucun fichier',
      });
      expect(screen.queryByText('Aucun fichier')).not.toBeInTheDocument();
    });

    it('should display error message when provided', () => {
      renderDropZone({ errorMessage: 'Erreur de téléchargement' });
      expect(screen.getByText('Erreur de téléchargement')).toBeInTheDocument();
    });

    it('should display file validation errors', () => {
      renderDropZone({
        fileErrors: {
          'test.exe': [{ type: 'type', message: 'Format non supporté' }],
        },
      });
      expect(screen.getByText('test.exe')).toBeInTheDocument();
      expect(screen.getByText('Format non supporté')).toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    it('should call onFilesSelect when files are dropped', () => {
      const onFilesSelect = vi.fn();
      renderDropZone({ onFilesSelect });

      const dropZone = screen.getByRole('button');
      const file = createMockFile('test.pdf');

      fireEvent.drop(dropZone, createDragEvent([file]));

      expect(onFilesSelect).toHaveBeenCalledWith([file]);
    });

    it('should call onFilesSelect with multiple files', () => {
      const onFilesSelect = vi.fn();
      renderDropZone({ onFilesSelect });

      const dropZone = screen.getByRole('button');
      const files = [createMockFile('a.pdf'), createMockFile('b.pdf')];

      fireEvent.drop(dropZone, createDragEvent(files));

      expect(onFilesSelect).toHaveBeenCalledWith(files);
    });

    it('should not call onFilesSelect when dropping empty file list', () => {
      const onFilesSelect = vi.fn();
      renderDropZone({ onFilesSelect });

      const dropZone = screen.getByRole('button');

      fireEvent.drop(dropZone, createDragEvent([]));

      expect(onFilesSelect).not.toHaveBeenCalled();
    });

    it('should not call onFilesSelect when isUploading is true', () => {
      const onFilesSelect = vi.fn();
      renderDropZone({ onFilesSelect, isUploading: true });

      const dropZone = screen.getByRole('button');
      const file = createMockFile('test.pdf');

      fireEvent.drop(dropZone, createDragEvent([file]));

      expect(onFilesSelect).not.toHaveBeenCalled();
    });

    it('should prevent default on dragOver', () => {
      renderDropZone();
      const dropZone = screen.getByRole('button');

      const event = new Event('dragover', { bubbles: true, cancelable: true });
      const prevented = !dropZone.dispatchEvent(event);

      expect(prevented).toBe(true);
    });
  });

  describe('file input', () => {
    it('should call onFilesSelect when files are selected via input', () => {
      const onFilesSelect = vi.fn();
      renderDropZone({ onFilesSelect });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = createMockFile('test.pdf');

      fireEvent.change(input, { target: { files: [file] } });

      expect(onFilesSelect).toHaveBeenCalledWith([file]);
    });
  });
});
