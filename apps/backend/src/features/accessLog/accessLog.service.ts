import { type Prisma, prisma } from '../../libs/prisma.js';
import type { CreateAccessLogDto } from './accessLog.type.js';

export const countAccessLogs = async () => {
  return prisma.accessLog.count();
};

export const countAccessLogsOlderThan = async (cutoff: Date) => {
  return prisma.accessLog.count({ where: { createdAt: { lt: cutoff } } });
};

export const deleteAccessLogsOlderThan = async (cutoff: Date) => {
  const { count } = await prisma.accessLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
};

export const getOldestAccessLogDate = async () => {
  const oldest = await prisma.accessLog.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  return oldest?.createdAt ?? null;
};

// `client` lets a caller write the trace in the same transaction as the traced action.
export const createAccessLog = async (data: CreateAccessLogDto, client: Prisma.TransactionClient = prisma) => {
  return client.accessLog.create({
    data: {
      entity: data.entity,
      entityId: data.entityId,
      action: data.action,
      userId: data.userId,
      topEntiteId: data.topEntiteId,
      requestId: data.requestId,
      path: data.path,
      dataKeys: data.dataKeys,
      params: data.params,
    },
  });
};
