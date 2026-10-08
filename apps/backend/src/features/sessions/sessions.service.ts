import { prisma, type Session } from '../../libs/prisma.js';
import type { SessionCreationDto } from './sessions.schema.js';

export const createSession = (sessionDto: SessionCreationDto): Promise<Session> =>
  prisma.session.create({
    data: {
      token: sessionDto.token,
      userId: sessionDto.userId,
      pcIdToken: sessionDto.pcIdToken,
      expiresAt: sessionDto.expiresAt,
    },
  });

export const getSession = (token: Session['token']): Promise<Session | null> =>
  prisma.session.findUnique({
    where: {
      token,
    },
  });

export const getSessionIdById = (id: Session['id']): Promise<Pick<Session, 'id'> | null> =>
  prisma.session.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

export const deleteSession = (token: Session['token']): Promise<Session> =>
  prisma.session.delete({
    where: {
      token,
    },
  });
