import { fr } from '@codegouvfr/react-dsfr';
import { formatFileSize } from '@/utils/fileHelpers';

interface SelectedFilesListProps {
  files: File[];
  title?: string;
  className?: string;
  variant?: 'default' | 'compact';
  onRemove?: (fileName: string) => void;
}

export const SelectedFilesList = ({
  files,
  title = 'Nouveaux fichiers sélectionnés :',
  className = 'fr-mt-2w',
  variant = 'default',
  onRemove,
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
            margin: 0,
            padding: '0.5rem 0.75rem 0.5rem 2rem',
            listStyleType: 'disc',
          }}
        >
          {files.map((file) => (
            <li key={file.name} className="fr-text--sm" style={{ padding: '0.375rem 0', marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span>
                  {file.name} ({formatFileSize(file.size)})
                </span>
                {onRemove && (
                  <button
                    type="button"
                    className={fr.cx('fr-btn', 'fr-btn--tertiary-no-outline', 'fr-btn--sm', 'fr-icon-delete-line')}
                    aria-label={`Supprimer ${file.name}`}
                    title={`Supprimer ${file.name}`}
                    onClick={() => onRemove(file.name)}
                    style={{ flexShrink: 0 }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="fr-text--sm fr-text--bold">{title}</p>
      <ul style={{ margin: 0, paddingLeft: '1.5rem', listStyleType: 'disc' }}>
        {files.map((file) => (
          <li key={file.name} className="fr-text--sm" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span>
                {file.name} ({formatFileSize(file.size)})
              </span>
              {onRemove && (
                <button
                  type="button"
                  className={fr.cx('fr-btn', 'fr-btn--tertiary-no-outline', 'fr-btn--sm', 'fr-icon-delete-line')}
                  aria-label={`Supprimer ${file.name}`}
                  title={`Supprimer ${file.name}`}
                  onClick={() => onRemove(file.name)}
                  style={{ flexShrink: 0 }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
