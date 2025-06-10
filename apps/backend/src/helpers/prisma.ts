import { Prisma } from '@/libs/prisma';

export const isPrismaError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

export const isPrismaUniqueConstraintError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  isPrismaError(error) && error.code === 'P2002';
