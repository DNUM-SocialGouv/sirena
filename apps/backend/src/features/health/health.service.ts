import { prisma } from '../../libs/prisma.js';

export async function checkHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return { healthy: true };
}
