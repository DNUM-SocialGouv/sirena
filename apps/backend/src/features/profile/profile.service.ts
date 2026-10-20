import { prisma, type User } from '../../libs/prisma.js';

export const acceptCgu = async (userId: User['id'], version: string) =>
  await prisma.user.update({
    where: { id: userId },
    data: { cguAcceptedVersion: version, cguAcceptedAt: new Date() },
    select: { cguAcceptedVersion: true, cguAcceptedAt: true },
  });
