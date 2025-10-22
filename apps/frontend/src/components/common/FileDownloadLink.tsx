import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { useId } from 'react';
import { formatFileSize } from '@/utils/fileHelpers';

type FileDownloadLinkProps = {
  href: string;
  fileName: string;
  fileSize?: number;
  className?: string;
  children?: React.ReactNode;
  target?: string;
  rel?: string;
};

const isFilePreviewable = (fileName: string): boolean => {
  const previewableExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.txt'];
  const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return previewableExtensions.includes(fileExtension);
};

export const FileDownloadLink = ({
  href,
  fileName,
  fileSize,
  className = 'fr-link',
  children,
  target = '_blank',
  rel = 'noopener noreferrer',
}: FileDownloadLinkProps) => {
  const modalId = useId();

  const downloadModal = createModal({
    id: `download-modal-${modalId}`,
    isOpenedByDefault: false,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (!isFilePreviewable(fileName)) {
      e.preventDefault();
      downloadModal.open();
    }
  };

  const displayName = children || (
    <>
      {fileName}
      {fileSize !== undefined && ` (${formatFileSize(fileSize)})`}
    </>
  );

  return (
    <>
      <a href={href} target={target} rel={rel} className={className} onClick={handleClick}>
        {displayName}
      </a>

      <downloadModal.Component
        title="Téléchargement de fichier"
        iconId="fr-icon-download-line"
        buttons={[
          {
            doClosesModal: true,
            children: 'Annuler',
          },
          {
            doClosesModal: true,
            children: 'Télécharger',
            onClick: () => {
              window.open(href, '_blank');
              downloadModal.close();
            },
          },
        ]}
      >
        <p>
          Le fichier <strong>{fileName}</strong> ne peut pas être prévisualisé dans le navigateur.
        </p>
        <p>Voulez-vous télécharger ce fichier ?{fileSize !== undefined && ` (${formatFileSize(fileSize)})`}</p>
      </downloadModal.Component>
    </>
  );
};
