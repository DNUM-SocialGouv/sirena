import { prisma } from '../../libs/prisma.js';
import type { CreateAccessLogDto } from './accessLog.type.js';

export const createAccessLog = async (data: CreateAccessLogDto) => {
  return prisma.accessLog.create({
    data: {
      entity: data.entity,
      entityId: data.entityId,
      action: data.action,
      userId: data.userId,
      requestId: data.requestId,
      path: data.path,
      dataKeys: data.dataKeys,
    },
  });
};
