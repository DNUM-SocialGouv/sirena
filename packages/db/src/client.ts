import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { type Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prismaStorage } from './asyncLocalStorage.js';

const pool = new pg.Pool({
  connectionString: process.env.PG_URL,
  ssl: process.env.PG_SSL_ALLOW_SELF_SIGNED === 'true' ? { rejectUnauthorized: false } : undefined,
});

const adapter = new PrismaPg(pool);

// Use globalThis for broader environment compatibility
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Named export with global memoization
const basePrisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    transactionOptions: {
      timeout: 30000,
      maxWait: 10000,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

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
