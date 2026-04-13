import { fr } from '@codegouvfr/react-dsfr';
import { useId, useRef, useState } from 'react';

import { ACCEPTED_FILE_TYPES, FILE_UPLOAD_HINT } from '@/utils/fileHelpers';
import type { FileValidationError } from '@/utils/fileValidation';

import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
  canEdit?: boolean;
  selectedFiles: File[];
  fileErrors: Record<string, FileValidationError[]>;
  errorMessage?: string | null;
  isUploading?: boolean;
  onFilesSelect: (files: File[]) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  multiple?: boolean;
  accept?: string;
  title?: string;
  buttonLabel?: string;
  emptyMessage?: string;
  hint?: string;
  maxSizeLabel?: string;
  supportedFormatsLabel?: string;
  validationTitle?: string;
  className?: string;
  errorTextClassName?: string;
}

export function FileDropZone({
  canEdit = true,
  selectedFiles,
  fileErrors,
  errorMessage,
  isUploading = false,
  onFilesSelect,
  inputRef,
  multiple = true,
  accept = ACCEPTED_FILE_TYPES,
  title = 'Sélectionner ou glisser un fichier à joindre',
  buttonLabel = 'Sélectionner un fichier',
  emptyMessage = 'Aucun fichier sélectionné',
  hint,
  maxSizeLabel,
  supportedFormatsLabel,
  validationTitle = 'Erreurs de validation',
  className,
  errorTextClassName,
}: FileDropZoneProps) {
  const inputId = useId();
  const errorMessageId = `${inputId}-error`;
  const hasErrors = Object.keys(fileErrors).length > 0;
  const hasGlobalError = Boolean(errorMessage);
  const resolvedHint =
    hint ??
    (maxSizeLabel || supportedFormatsLabel
      ? `Taille maximale : ${maxSizeLabel ?? '200 Mo'}. Formats supportés : ${supportedFormatsLabel ?? 'PDF, EML, Word, Excel, PowerPoint, OpenOffice, MSG, CSV, TXT, images (PNG, JPEG, HEIC, WEBP, TIFF)'}.`
      : FILE_UPLOAD_HINT);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const openFileDialog = () => {
    if (!canEdit || isUploading) {
      return;
    }

    const input = inputRef?.current ?? document.getElementById(inputId);
    if (input instanceof HTMLInputElement) {
      input.click();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (isUploading) return;

    const { files } = e.dataTransfer;
    if (files.length > 0) {
      onFilesSelect(Array.from(files));
    }
  };

  return (
    <>
      {canEdit && (
        <div className={className}>
          <button
            type="button"
            className={[styles.dropZone, isDragging && styles.dropZoneDragging].filter(Boolean).join(' ')}
            disabled={isUploading}
            aria-describedby={hasGlobalError ? errorMessageId : undefined}
            aria-invalid={hasGlobalError || hasErrors}
            onClick={openFileDialog}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <p className={styles.dropZoneTitle}>{title}</p>
            <span className={[fr.cx('fr-btn', 'fr-btn--secondary'), styles.dropZoneButton].join(' ')}>
              {buttonLabel}
            </span>
            {selectedFiles.length === 0 && <p className={styles.dropZoneNoFile}>{emptyMessage}</p>}
            <p className={styles.dropZoneHint}>{resolvedHint}</p>
          </button>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            multiple={multiple}
            className={styles.dropZoneInput}
            accept={accept}
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                onFilesSelect(Array.from(files));
              }
            }}
          />
        </div>
      )}

      {hasGlobalError && (
        <p
          id={errorMessageId}
          className={[fr.cx('fr-text--sm', 'fr-mt-1w'), errorTextClassName].filter(Boolean).join(' ')}
        >
          {errorMessage}
        </p>
      )}

      {hasErrors && (
        <div className={fr.cx('fr-mt-2w')}>
          <h4 className={[fr.cx('fr-text--sm', 'fr-text--bold'), errorTextClassName].filter(Boolean).join(' ')}>
            {validationTitle}
          </h4>
          {Object.entries(fileErrors).map(([fileName, errors]) => (
            <div key={fileName} className={fr.cx('fr-mb-1w')}>
              <p className={[fr.cx('fr-text--sm', 'fr-text--bold'), errorTextClassName].filter(Boolean).join(' ')}>
                {fileName}
              </p>
              {errors.map((error) => (
                <p
                  key={`${fileName}-error-${error.message}`}
                  className={[fr.cx('fr-text--xs'), errorTextClassName].filter(Boolean).join(' ')}
                >
                  {error.message}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
