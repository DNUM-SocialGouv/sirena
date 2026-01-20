import { type Prisma, prisma } from '../../libs/prisma.js';
import type { CreateChangeLogDto } from './changelog.type.js';

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
