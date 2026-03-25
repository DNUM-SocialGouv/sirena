import { formatFileSize } from '@/utils/fileHelpers';

interface SelectedFilesListProps {
  files: File[];
  title?: string;
  className?: string;
  variant?: 'default' | 'compact';
}

export const SelectedFilesList = ({
  files,
  title = 'Nouveaux fichiers sélectionnés :',
  className = 'fr-mt-2w',
  variant = 'default',
}: SelectedFilesListProps) => {
  if (!files.length) return null;

  if (variant === 'compact') {
    return (
      <div className={className}>
        {title ? <p className="fr-text--xs fr-mb-1w">{title}</p> : null}
        <ul
          style={{
            border: '1px solid var(--border-default-grey)',
            borderRadius: '0.5rem',
            background: 'var(--background-alt-grey)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {files.map((file) => (
            <li
              key={file.name}
              className="fr-text--sm"
              style={{
                padding: '0.375rem 0.75rem',
                marginBottom: 0,
              }}
            >
              {file.name} ({formatFileSize(file.size)})
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="fr-text--sm fr-text--bold">{title}</p>
      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
        {files.map((file) => (
          <li key={file.name} className="fr-text--sm" style={{ marginBottom: 0 }}>
            {file.name} ({formatFileSize(file.size)})
          </li>
        ))}
      </ul>
    </div>
  );
};
