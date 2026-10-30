import { envVars } from '../../config/env.js';
import { DOCUMENT_EXPORT_READY_TEMPLATE_NAME } from '../../config/tipimail.constant.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';

export type ReadyDocumentExport = {
  id: string;
  type: string;
  fileName: string | null;
  expiresAt: Date | null;
  user: { id: string; email: string; prenom: string; nom: string };
};

export const getDocumentExportDownloadUrl = (documentExportId: string) =>
  `${envVars.FRONTEND_URI}/telechargement/${documentExportId}`;

/**
 * Sends the requester the download link of their document. The e-mail holds the link and the
 * requester's name only, never data of the document.
 */
export async function notifyDocumentExportReady(documentExport: ReadyDocumentExport): Promise<void> {
  const { user } = documentExport;

  await sendTipimailEmail({
    to: user.email,
    subject: '',
    text: '',
    template: DOCUMENT_EXPORT_READY_TEMPLATE_NAME,
    substitutions: [
      {
        email: user.email,
        values: {
          prenom: user.prenom,
          nom: user.nom,
          urlsirena: getDocumentExportDownloadUrl(documentExport.id),
          signature: '',
        },
      },
    ],
  });

  getLoggerStore().info(
    { documentExportId: documentExport.id, userId: user.id, expiresAt: documentExport.expiresAt },
    '[document-export] Download link e-mail sent',
  );
}
