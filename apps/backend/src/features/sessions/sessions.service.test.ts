import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { SessionCreationSchema } from './sessions.schema.js';
import { createSession, deleteSession, getSession, getSessionById } from './sessions.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockedSession = vi.mocked(prisma.session);

describe('sessions.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSession - should call prisma.session.create and return created session', async () => {
    const sessionDto = {
      token: 'token123',
      userId: 'user-abc',
      pcIdToken: 'pc-id-token',
      expiresAt: new Date('2025-07-01T00:00:00.000Z'),
      createdAt: new Date('2025-07-01T00:00:00.000Z'),
    };

    const created = { id: 'sess-1', ...sessionDto };
    mockedSession.create.mockResolvedValueOnce(created);

    const result = await createSession(sessionDto);

    expect(mockedSession.create).toHaveBeenCalledWith({
      data: {
        token: sessionDto.token,
        userId: sessionDto.userId,
        pcIdToken: sessionDto.pcIdToken,
        expiresAt: sessionDto.expiresAt,
      },
    });
    expect(result).toEqual(created);
  });

  it('getSession - should call prisma.session.findUnique and return session', async () => {
    const token = 'token123';
    const session = {
      id: 'sess-1',
      token: 'token123',
      userId: 'user-abc',
      createdAt: new Date('2025-06-27T00:00:00.000Z'),
      expiresAt: new Date('2025-07-01T00:00:00.000Z'),
      pcIdToken: 'pc-id-token',
    };

    mockedSession.findUnique.mockResolvedValueOnce(session);

    const result = await getSession(token);

    expect(mockedSession.findUnique).toHaveBeenCalledWith({
      where: { token },
    });
    expect(result).toEqual(session);
  });

  it('getSessionById - should call prisma.session.findUnique on the primary key and return session', async () => {
    const id = 'sess-1';
    const session = {
      id,
      token: 'token123',
      userId: 'user-abc',
      createdAt: new Date('2025-06-27T00:00:00.000Z'),
      expiresAt: new Date('2025-07-01T00:00:00.000Z'),
      pcIdToken: 'pc-id-token',
    };

    mockedSession.findUnique.mockResolvedValueOnce(session);

    const result = await getSessionById(id);

    expect(mockedSession.findUnique).toHaveBeenCalledWith({
      where: { id },
    });
    expect(result).toEqual(session);
  });

  it('getSessionById - should return null when no session matches the id', async () => {
    mockedSession.findUnique.mockResolvedValueOnce(null);

    const result = await getSessionById('unknown-id');

    expect(result).toBeNull();
  });

  it('deleteSession - should call prisma.session.delete and return deleted session', async () => {
    const token = 'token123';
    const deleted = {
      id: 'sess-1',
      token: 'token123',
      userId: 'user-abc',
      createdAt: new Date('2025-06-27T00:00:00.000Z'),
      expiresAt: new Date('2025-07-01T00:00:00.000Z'),
      pcIdToken: 'pc-id-token',
    };

    mockedSession.delete.mockResolvedValueOnce(deleted);

    const result = await deleteSession(token);

    expect(mockedSession.delete).toHaveBeenCalledWith({
      where: { token },
    });
    expect(result).toEqual(deleted);
  });
});

describe('SessionCreationSchema', () => {
  it('should validate a valid session payload', () => {
    const payload = {
      userId: 'user-abc',
      token: 'token123',
      pcIdToken: 'pc-id-token',
      expiresAt: new Date('2025-07-01T00:00:00.000Z'),
    };

    const result = SessionCreationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should fail if required fields are missing', () => {
    const result = SessionCreationSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((e) => e.path)).toEqual([['userId'], ['token'], ['pcIdToken'], ['expiresAt']]);
    }
  });
});
