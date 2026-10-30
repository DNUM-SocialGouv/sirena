import { DOCUMENT_EXPORT_ACCESS_STATUS } from '@sirena/common/constants';
import { Loader } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import {
  DocumentExportAccessDenied,
  DocumentExportDownload,
  DocumentExportLinkExpired,
} from '@/components/documentExports/DocumentExportPages';
import { AuthLayout } from '@/components/layout/auth/layout';
import { QueryErrorState } from '@/components/queryStateHandler/queryStateHandler';
import { useDocumentExportAccess } from '@/hooks/queries/documentExports.hook';
import { getDocumentExportDownloadUrl } from '@/lib/api/fetchDocumentExports';

// Under _auth only, not _user: a visitor without access must land on « Accès impossible »,
// not be sent back to their home page by a role guard.
export const Route = createFileRoute('/_auth/telechargement/$documentExportId')({
  head: () => ({
    meta: [{ title: 'Téléchargement d’un document - SIRENA' }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { documentExportId } = Route.useParams();
  const access = useDocumentExportAccess(documentExportId);

  return (
    <AuthLayout>
      {access.isPending ? (
        <Loader />
      ) : access.isError ? (
        <QueryErrorState message="Le lien de téléchargement n’a pas pu être vérifié. Réessayez dans quelques instants." />
      ) : access.data.status === DOCUMENT_EXPORT_ACCESS_STATUS.AVAILABLE ? (
        <DocumentExportDownload
          downloadUrl={getDocumentExportDownloadUrl(documentExportId)}
          fileName={access.data.fileName}
          expiresAt={access.data.expiresAt}
        />
      ) : access.data.status === DOCUMENT_EXPORT_ACCESS_STATUS.EXPIRED ? (
        <DocumentExportLinkExpired />
      ) : (
        <DocumentExportAccessDenied />
      )}
    </AuthLayout>
  );
}
