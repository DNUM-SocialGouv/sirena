import type { AccessLog, Prisma } from '../../libs/prisma.js';

export enum AccessLogAction {
  EXPORT_ENTITY_PDF = 'EXPORT_ENTITY_PDF',
  EXPORT_REQUETES_CSV = 'EXPORT_REQUETES_CSV',
  DOWNLOAD_DOCUMENT_EXPORT = 'DOWNLOAD_DOCUMENT_EXPORT',
  // params.reason tells why: ACCESS_DENIED (not the requester) or LINK_EXPIRED.
  DOWNLOAD_DOCUMENT_EXPORT_REFUSED = 'DOWNLOAD_DOCUMENT_EXPORT_REFUSED',
}

export type CreateAccessLogDto = Omit<AccessLog, 'id' | 'createdAt' | 'params'> & {
  action: AccessLogAction;
  params?: Prisma.InputJsonValue;
};
