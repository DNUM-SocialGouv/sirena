import { type Prisma, prisma } from '../libs/prisma.js';
import type { EndCronParams, StartCronParams } from './crons.type.js';

export const getLastCron = async (name: string) =>
  await prisma.crons.findFirst({
    where: {
      name,
      state: 'success',
    },
    orderBy: { createdAt: 'desc' },
  });

export const startCron = async ({ name, startedAt, params }: StartCronParams) =>
  await prisma.crons.create({
    data: {
      name,
      state: 'started',
      startedAt,
      params: params as Prisma.JsonObject,
    },
  });

export const endCron = async ({ id, state, result, endedAt }: EndCronParams) =>
  await prisma.crons.update({
    where: {
      id,
    },
    data: {
      result: result as Prisma.JsonObject,
      state,
      endedAt,
    },
  });
