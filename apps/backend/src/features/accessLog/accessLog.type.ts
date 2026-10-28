import type { AccessLog, Prisma } from '../../libs/prisma.js';

export enum AccessLogAction {
  EXPORT_ENTITY_PDF = 'EXPORT_ENTITY_PDF',
  EXPORT_REQUETES_CSV = 'EXPORT_REQUETES_CSV',
}

export type CreateAccessLogDto = Omit<AccessLog, 'id' | 'createdAt' | 'params'> & {
  action: AccessLogAction;
  params?: Prisma.InputJsonValue;
};
