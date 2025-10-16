import { formatFileSize } from '@/utils/fileHelpers';

interface SelectedFilesListProps {
  files: File[];
  title?: string;
  className?: string;
}

export const SelectedFilesList = ({
  files,
  title = 'Nouveaux fichiers sélectionnés :',
  className = 'fr-mt-2w',
}: SelectedFilesListProps) => {
  if (!files.length) return null;

  return (
    <div className={className}>
      <p className="fr-text--sm fr-text--bold">{title}</p>
      {files.map((file) => (
        <p key={file.name} className="fr-text--sm">
          {file.name} ({formatFileSize(file.size)})
        </p>
      ))}
    </div>
  );
};
