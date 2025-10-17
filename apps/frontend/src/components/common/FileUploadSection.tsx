import { Upload } from '@codegouvfr/react-dsfr/Upload';
import type { FileInfo } from '@/utils/fileHelpers';
import { ACCEPTED_FILE_TYPES, FILE_UPLOAD_HINT } from '@/utils/fileHelpers';
import { FileList } from './FileList';
import { SelectedFilesList } from './SelectedFilesList';

interface FileUploadSectionProps {
  label: string;
  existingFiles?: FileInfo[];
  getFileUrl?: (fileId: string) => string;
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  hint?: string;
  accept?: string;
  existingFilesTitle?: string;
  selectedFilesTitle?: string;
}

export const FileUploadSection = ({
  label,
  existingFiles,
  getFileUrl,
  selectedFiles,
  onFilesChange,
  disabled = false,
  multiple = true,
  hint = FILE_UPLOAD_HINT,
  accept = ACCEPTED_FILE_TYPES,
  existingFilesTitle,
  selectedFilesTitle,
}: FileUploadSectionProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      onFilesChange(Array.from(files));
    }
  };

  const hasExistingFiles = existingFiles?.length && getFileUrl;

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {hasExistingFiles && <FileList files={existingFiles} getFileUrl={getFileUrl} title={existingFilesTitle} />}

      <div className="fr-col-12">
        <Upload
          label={label}
          hint={hint}
          multiple={multiple}
          disabled={disabled}
          nativeInputProps={{
            accept,
            onChange: handleFileChange,
          }}
        />

        <SelectedFilesList files={selectedFiles} title={selectedFilesTitle} />
      </div>
    </div>
  );
};
