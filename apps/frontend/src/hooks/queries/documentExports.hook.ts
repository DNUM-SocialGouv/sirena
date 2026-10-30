import { useQuery } from '@tanstack/react-query';
import { fetchDocumentExportAccess } from '@/lib/api/fetchDocumentExports';

export const useDocumentExportAccess = (documentExportId: string) =>
  useQuery({
    queryKey: ['document-exports', documentExportId, 'access'],
    queryFn: () => fetchDocumentExportAccess(documentExportId),
    // Each check is traced: only check again when the page is opened again.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
