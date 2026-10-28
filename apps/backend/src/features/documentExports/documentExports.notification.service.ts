import { getLoggerStore } from '../../libs/asyncLocalStorage.js';

export type ReadyDocumentExport = {
  id: string;
  type: string;
  fileName: string | null;
  expiresAt: Date | null;
  user: { id: string; email: string; prenom: string; nom: string };
};

/**
 * Called once a document is generated and stored. Sending the e-mail with the download link
 * (Tipimail template "telechargement-document") and serving the download belong to the
 * dedicated download ticket; until then the document is only traced as ready.
 */
export async function notifyDocumentExportReady(documentExport: ReadyDocumentExport): Promise<void> {
  getLoggerStore().info(
    { documentExportId: documentExport.id, type: documentExport.type, expiresAt: documentExport.expiresAt },
    '[document-export] Document ready, waiting for the download link e-mail',
  );
}
