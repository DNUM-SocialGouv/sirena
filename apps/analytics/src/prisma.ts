import { PrismaClient as SourcePrismaClient } from '@sirena/db/generated/prisma';
import { PrismaClient as AnalyticsPrismaClient } from '../generated/prisma/index.js';

export const sourceDb = new SourcePrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

export const analyticsDb = new AnalyticsPrismaClient({
  datasourceUrl: process.env.ANALYTICS_DATABASE_URL,
});

export type { AnalyticsPrismaClient, SourcePrismaClient };
