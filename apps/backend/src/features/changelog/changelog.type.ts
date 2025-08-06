import type { ChangeLog } from '@/libs/prisma';

export enum ChangeLogAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
}

export type CreateChangeLogDto = Omit<ChangeLog, 'id' | 'changedAt'> & {
  action: ChangeLogAction;
};
