import { type Prisma, PrismaClient } from '../../generated/client/index.js';
import { prismaStorage } from './asyncLocalStorage.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    transactionOptions: {
      timeout: 60000,
      maxWait: 10000,
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export const prisma = new Proxy(basePrisma, {
  get(target, prop) {
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
    return target[prop as keyof typeof target];
  },
});

export * from '../../generated/client/index.js';
