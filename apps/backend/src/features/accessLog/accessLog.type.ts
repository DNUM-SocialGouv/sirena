import type { AccessLog } from '../../libs/prisma.js';

export enum AccessLogAction {
  EXPORT_ENTITY_PDF = 'EXPORT_ENTITY_PDF',
}

export type CreateAccessLogDto = Omit<AccessLog, 'id' | 'createdAt'> & {
  action: AccessLogAction;
};
