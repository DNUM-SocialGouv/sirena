import type { FileInfo } from '@/utils/fileHelpers';
import { FileDownloadLink } from './FileDownloadLink';

interface FileListProps {
  files: FileInfo[];
  getFileUrl: (fileId: string) => string;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export const FileList = ({
  files,
  getFileUrl,
  title = 'Fichiers déjà ajoutés :',
  emptyMessage,
  className = 'fr-col-12 fr-mb-3w',
}: FileListProps) => {
  if (!files.length) {
    return emptyMessage ? <p className="fr-text--sm">{emptyMessage}</p> : null;
  }

  return (
    <div className={className}>
      {title && <p className="fr-text--sm fr-text--bold fr-mb-1w">{title}</p>}
      <ul>
        {files.map((file) => (
          <li key={file.id}>
            <FileDownloadLink href={getFileUrl(file.id)} fileName={file.fileName} fileSize={file.size} />
          </li>
        ))}
      </ul>
    </div>
  );
};
