import { PrismaClient } from '../../generated/client/index.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    transactionOptions: {
      timeout: 60000,
      maxWait: 10000,
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '../../generated/client/index.js';
