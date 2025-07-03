import { prisma } from '@/libs/prisma';

export async function checkHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true };
  } catch (error) {
    return {
      healthy: false,
      reason: (error as Error).message,
    };
  }
}
