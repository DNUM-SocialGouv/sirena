import { DOCUMENT_EXPORT_ACCESS_STATUS } from '@sirena/common/constants';
import { Loader } from '@sirena/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import {
  DocumentExportAccessDenied,
  DocumentExportCheckFailed,
  DocumentExportDownload,
  DocumentExportLinkExpired,
} from '@/components/documentExports/DocumentExportPages';
import { AuthLayout } from '@/components/layout/auth/layout';
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
  const { refetch } = access;
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <AuthLayout>
      {access.isPending || access.isFetching ? (
        <Loader />
      ) : access.isError ? (
        <DocumentExportCheckFailed onRetry={retry} />
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
