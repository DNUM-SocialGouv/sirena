import type { SessionCreationDto } from '@/features/sessions/sessions.schema';
import { prisma, type Session } from '@/libs/prisma';

export const createSession = (sessionDto: SessionCreationDto) =>
  prisma.session.create({
    data: {
      token: sessionDto.token,
      userId: sessionDto.userId,
      pcIdToken: sessionDto.pcIdToken,
      expiresAt: sessionDto.expiresAt,
    },
  });

export const getSession = (token: Session['token']) =>
  prisma.session.findUnique({
    where: {
      token,
    },
  });

export const deleteSession = (token: Session['token']) =>
  prisma.session.delete({
    where: {
      token,
    },
  });
