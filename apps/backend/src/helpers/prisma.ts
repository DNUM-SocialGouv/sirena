import { Prisma } from '../libs/prisma.js';

export const isPrismaError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

export const isPrismaUniqueConstraintError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  isPrismaError(error) && error.code === 'P2002';

export const isOperationDependsOnRecordNotFoundError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError => isPrismaError(error) && error.code === 'P2025';
