import { DOCUMENT_EXPORT_ACCESS_STATUS, type DocumentExportAccessStatus } from '@sirena/common/constants';
import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export type DocumentExportAccess = {
  status: DocumentExportAccessStatus;
  fileName: string | null;
  expiresAt: string | null;
};

export const getDocumentExportDownloadUrl = (documentExportId: string) =>
  `/api/document-exports/${encodeURIComponent(documentExportId)}/download`;

export async function fetchDocumentExportAccess(documentExportId: string): Promise<DocumentExportAccess> {
  const res = await client['document-exports'][':id'].access.$get({ param: { id: documentExportId } });
  // A malformed link points to no export of the user.
  if (res.status === 400) {
    return { status: DOCUMENT_EXPORT_ACCESS_STATUS.DENIED, fileName: null, expiresAt: null };
  }
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}
