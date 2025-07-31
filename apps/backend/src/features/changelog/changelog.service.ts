import { type Prisma, prisma } from '@/libs/prisma';
import type { CreateChangeLogDto } from './changelog.type';

export const createChangeLog = async (data: CreateChangeLogDto) => {
  return prisma.changeLog.create({
    data: {
      entity: data.entity,
      entityId: data.entityId,
      action: data.action,
      before: data.before as Prisma.JsonObject,
      after: data.after as Prisma.JsonObject,
      changedById: data.changedById,
    },
  });
};
