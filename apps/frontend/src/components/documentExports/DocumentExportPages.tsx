import { fr } from '@codegouvfr/react-dsfr';
import DocumentDownload from '@codegouvfr/react-dsfr/picto/DocumentDownload';
import TechnicalError from '@codegouvfr/react-dsfr/picto/TechnicalError';
import { DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES } from '@sirena/common/constants';
import { Link } from '@tanstack/react-router';
import { formatFileSize } from '@/utils/fileHelpers';
import { DocumentExportMessage } from './DocumentExportMessage';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

type DocumentExportDownloadProps = {
  downloadUrl: string;
  fileName: string | null;
  size: number | null;
  expiresAt: string | null;
};

// Format and weight of the file, as shown for attachments: "CSV, 12.34 Ko".
const getFileDetail = (fileName: string | null, size: number | null) => {
  const extension = fileName?.includes('.') ? fileName.split('.').pop()?.toUpperCase() : undefined;
  const parts = [extension, size !== null ? formatFileSize(size) : undefined].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

export const DocumentExportDownload = ({ downloadUrl, fileName, size, expiresAt }: DocumentExportDownloadProps) => {
  const fileDetail = getFileDetail(fileName, size);

  return (
    <DocumentExportMessage
      title="Téléchargement de votre export"
      description={
        <>
          Votre fichier{fileName ? <> {fileName}</> : null}
          {fileDetail ? <> ({fileDetail})</> : null} est prêt.
        </>
      }
      picto={<DocumentDownload fontSize="10rem" />}
      actions={
        <a className={fr.cx('fr-btn', 'fr-btn--icon-left', 'fr-icon-download-line')} href={downloadUrl} download>
          Télécharger votre export
        </a>
      }
    >
      {expiresAt ? (
        <p className={fr.cx('fr-mb-0')}>Le lien reste valable jusqu’à {timeFormatter.format(new Date(expiresAt))}.</p>
      ) : null}
    </DocumentExportMessage>
  );
};

export const DocumentExportAccessDenied = () => (
  <DocumentExportMessage
    title="Accès impossible"
    description="Vous n’avez pas accès à ce document."
    picto={<TechnicalError fontSize="10rem" />}
    actions={
      <Link className={fr.cx('fr-btn')} to="/">
        Page d’accueil SIRENA
      </Link>
    }
  >
    <p className={fr.cx('fr-mb-0')}>Seule la personne qui a demandé l’export peut télécharger ce fichier.</p>
  </DocumentExportMessage>
);

export const DocumentExportLinkExpired = () => (
  <DocumentExportMessage
    title="Ce lien n’est plus valide"
    description={`Le lien de téléchargement n’est valable que ${DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES} minutes et le fichier a été supprimé.`}
    picto={<TechnicalError fontSize="10rem" />}
    actions={
      <Link className={fr.cx('fr-btn')} to="/statistiques">
        Relancer un export
      </Link>
    }
  >
    <p className={fr.cx('fr-mb-0')}>Pour récupérer les données, relancez un export depuis la page Indicateurs.</p>
  </DocumentExportMessage>
);

type DocumentExportCheckFailedProps = {
  onRetry: () => void;
};

export const DocumentExportCheckFailed = ({ onRetry }: DocumentExportCheckFailedProps) => (
  <DocumentExportMessage
    title="Vérification impossible"
    description="Le lien de téléchargement n’a pas pu être vérifié."
    picto={<TechnicalError fontSize="10rem" />}
    actions={[
      <button key="retry" type="button" className={fr.cx('fr-btn')} onClick={onRetry}>
        Réessayer
      </button>,
      <Link key="home" className={fr.cx('fr-btn', 'fr-btn--secondary')} to="/">
        Page d’accueil SIRENA
      </Link>,
    ]}
  >
    <p className={fr.cx('fr-mb-0')}>Réessayez dans quelques instants. Si le problème persiste, relancez un export.</p>
  </DocumentExportMessage>
);
