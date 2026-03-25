import { PrismaPg } from '@prisma/adapter-pg';
import { type Prisma, PrismaClient } from '../../generated/client/index.js';
import { prismaStorage } from './asyncLocalStorage.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export function createPrismaAdapter() {
  return new PrismaPg({ connectionString: process.env.PG_URL });
}

function getBasePrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: createPrismaAdapter(),
      transactionOptions: {
        timeout: 30000,
        maxWait: 10000,
      },
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const base = getBasePrisma();
    const transaction = prismaStorage.getStore();

    if (transaction && prop === '$transaction') {
      return async <T>(arg: Promise<T>[] | ((client: Prisma.TransactionClient) => Promise<T>)) => {
        if (typeof arg === 'function') {
          return arg(transaction as Prisma.TransactionClient);
        }
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
      };
    }

    if (transaction && prop in transaction) {
      return transaction[prop as keyof typeof transaction];
    }
    return base[prop as keyof typeof base];
  },
});

export * from '../../generated/client/index.js';
