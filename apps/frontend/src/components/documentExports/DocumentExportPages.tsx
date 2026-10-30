import { fr } from '@codegouvfr/react-dsfr';
import DocumentDownload from '@codegouvfr/react-dsfr/picto/DocumentDownload';
import TechnicalError from '@codegouvfr/react-dsfr/picto/TechnicalError';
import { DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES } from '@sirena/common/constants';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { DocumentExportMessage } from './DocumentExportMessage';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

type DocumentExportDownloadProps = {
  downloadUrl: string;
  fileName: string | null;
  expiresAt: string | null;
};

export const DocumentExportDownload = ({ downloadUrl, fileName, expiresAt }: DocumentExportDownloadProps) => {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const started = useRef(false);

  // The link of the e-mail starts the download by itself, once.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    linkRef.current?.click();
  }, []);

  return (
    <DocumentExportMessage
      title="Téléchargement de votre export"
      lead={<>Le téléchargement de votre fichier{fileName ? <> {fileName}</> : null} démarre automatiquement.</>}
      picto={<DocumentDownload fontSize="10rem" />}
      actions={
        <li>
          <a
            ref={linkRef}
            className={fr.cx('fr-btn', 'fr-btn--icon-left', 'fr-icon-download-line')}
            href={downloadUrl}
            download
          >
            Télécharger le fichier
          </a>
        </li>
      }
    >
      <p className={fr.cx('fr-mb-0')}>
        S’il ne démarre pas, utilisez le bouton ci-dessous.
        {expiresAt ? <> Le lien reste valable jusqu’à {timeFormatter.format(new Date(expiresAt))}.</> : null}
      </p>
    </DocumentExportMessage>
  );
};

export const DocumentExportAccessDenied = () => (
  <DocumentExportMessage
    title="Accès impossible"
    lead="Vous n’avez pas accès à ce document."
    picto={<TechnicalError fontSize="10rem" />}
    actions={
      <li>
        <Link className={fr.cx('fr-btn')} to="/">
          Page d’accueil
        </Link>
      </li>
    }
  >
    <p className={fr.cx('fr-mb-0')}>Seule la personne qui a demandé l’export peut télécharger ce fichier.</p>
  </DocumentExportMessage>
);

export const DocumentExportLinkExpired = () => (
  <DocumentExportMessage
    title="Ce lien n’est plus valide"
    lead={`Le lien de téléchargement n’est valable que ${DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES} minutes et le fichier a été supprimé.`}
    picto={<TechnicalError fontSize="10rem" />}
    actions={
      <li>
        <Link className={fr.cx('fr-btn')} to="/statistiques">
          Relancer un export
        </Link>
      </li>
    }
  >
    <p className={fr.cx('fr-mb-0')}>Pour récupérer les données, relancez un export depuis la page Indicateurs.</p>
  </DocumentExportMessage>
);
