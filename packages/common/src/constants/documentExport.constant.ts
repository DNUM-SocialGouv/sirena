// How long the download link of a generated document (e.g. the requêtes CSV export) stays valid.
export const DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES = 30;

// What the download link of a document leads to: the file, or a page explaining why it cannot.
export const DOCUMENT_EXPORT_ACCESS_STATUS = {
  AVAILABLE: 'AVAILABLE',
  // Someone other than the requester opened the link.
  DENIED: 'DENIED',
  // The link is past its validity: the file is, or is about to be, deleted.
  EXPIRED: 'EXPIRED',
} as const;

export type DocumentExportAccessStatus =
  (typeof DOCUMENT_EXPORT_ACCESS_STATUS)[keyof typeof DOCUMENT_EXPORT_ACCESS_STATUS];
