import type { Prisma } from '@/libs/prisma';
import { prisma } from '@/libs/prisma';

export type ImportFailureErrorType = 'TECHNICAL' | 'FUNCTIONAL' | 'UNKNOWN';

export interface CreateImportFailureInput {
  dematSocialId: number;
  errorType: ImportFailureErrorType;
  errorMessage: string;
  errorContext?: Prisma.InputJsonValue | null;
}

export interface ImportFailureResult {
  id: string;
  dematSocialId: number;
  errorType: ImportFailureErrorType;
  errorMessage: string;
  errorContext: Prisma.InputJsonValue | null;
  retryCount: number;
  lastRetryAt: Date | null;
  resolvedAt: Date | null;
  resolvedRequeteId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Records an import failure for a Démat Social file
 */
export const createImportFailure = async (input: CreateImportFailureInput) => {
  return prisma.dematSocialImportFailure.upsert({
    where: { dematSocialId: input.dematSocialId },
    create: {
      dematSocialId: input.dematSocialId,
      errorType: input.errorType,
      errorMessage: input.errorMessage,
      errorContext: input.errorContext ? (input.errorContext as Prisma.InputJsonValue) : undefined,
      retryCount: 0,
    },
    update: {
      errorType: input.errorType,
      errorMessage: input.errorMessage,
      errorContext: input.errorContext ? (input.errorContext as Prisma.InputJsonValue) : undefined,
      retryCount: { increment: 1 },
      lastRetryAt: new Date(),
      updatedAt: new Date(),
    },
  });
};

/**
 * Retrieves all unresolved failures
 */
export const getUnresolvedFailures = async (batchSize: number = 10) => {
  return prisma.dematSocialImportFailure.findMany({
    where: {
      resolvedAt: null,
    },
    orderBy: [{ retryCount: 'asc' }, { createdAt: 'asc' }],
    take: batchSize,
  });
};

/**
 * Marks a failure as resolved after a successful import
 */
export const markFailureAsResolved = async (dematSocialId: number, resolvedRequeteId: string): Promise<void> => {
  await prisma.dematSocialImportFailure.updateMany({
    where: {
      dematSocialId,
      resolvedAt: null,
    },
    data: {
      resolvedAt: new Date(),
      resolvedRequeteId,
    },
  });
};

/**
 * Counts unresolved failures by error type
 */
export const countUnresolvedFailuresByType = async (): Promise<
  Array<{ errorType: ImportFailureErrorType; count: number }>
> => {
  const results = await prisma.dematSocialImportFailure.groupBy({
    by: ['errorType'],
    where: {
      resolvedAt: null,
    },
    _count: {
      id: true,
    },
  });

  return results.map((r) => ({
    errorType: r.errorType as ImportFailureErrorType,
    count: r._count.id,
  }));
};

/**
 * Retrieves the list of failed file numbers
 */
export const getFailedDossierNumbers = async (): Promise<number[]> => {
  const failures = await prisma.dematSocialImportFailure.findMany({
    where: {
      resolvedAt: null,
    },
    select: {
      dematSocialId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return failures.map((f) => f.dematSocialId);
};
