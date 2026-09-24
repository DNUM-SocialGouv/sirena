import type { PinoLogger } from 'hono-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import {
  createRequeteMessage,
  getRequeteMessageById,
  getRequeteMessages,
  getUnreadCount,
  markAllMessagesAsRead,
} from './requeteMessages.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    requeteMessage: {
      create: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    requeteMessageRead: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

const mockedMessage = vi.mocked(prisma.requeteMessage);
const mockedMessageRead = vi.mocked(prisma.requeteMessageRead);

const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as unknown as PinoLogger;

const baseRow = {
  id: 'm1',
  requeteId: 'REQ',
  contenu: 'Bonjour',
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  entite: { id: 'e1', nomComplet: 'ARS Île-de-France', entiteTypeId: 'ARS' },
  author: { prenom: 'Jean', nom: 'Dupont' },
  reads: [] as { userId: string }[],
};

const row = (overrides: Partial<typeof baseRow> = {}) => ({ ...baseRow, ...overrides });

describe('requeteMessages.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation((async (cb: (tx: unknown) => unknown) => cb(prisma)) as never);
    mockedMessage.count.mockResolvedValue(0 as never);
  });

  describe('getRequeteMessages()', () => {
    it('asks for one row more than the limit and reports no next page when it is not returned', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([row(), row({ id: 'm2' })] as never);

      const result = await getRequeteMessages('REQ', 'user1', { limit: 2 });

      expect(mockedMessage.findFirst).not.toHaveBeenCalled();
      expect(mockedMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { requeteId: 'REQ' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 3,
        }),
      );
      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({ hasMore: false, nextCursor: null });
    });

    it('trims the extra row and returns the id of the last message of the page as cursor', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([row(), row({ id: 'm2' }), row({ id: 'm3' })] as never);

      const result = await getRequeteMessages('REQ', 'user1', { limit: 2 });

      expect(result.data.map((message) => message.id)).toEqual(['m1', 'm2']);
      expect(result.meta).toEqual({ hasMore: true, nextCursor: 'm2' });
    });

    it('only selects the read row of the current user', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([] as never);

      await getRequeteMessages('REQ', 'user1', { limit: 50 });

      const [{ select }] = mockedMessage.findMany.mock.calls[0] as [{ select: Record<string, unknown> }];
      expect(select.reads).toEqual({ where: { userId: 'user1' }, select: { userId: true }, take: 1 });
    });

    it('exposes isReadByCurrentUser and never leaks the read rows', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([
        row({ reads: [{ userId: 'user1' }] }),
        row({ id: 'm2', reads: [] }),
      ] as never);

      const result = await getRequeteMessages('REQ', 'user1', { limit: 50 });
      const [first, second] = result.data;

      expect(first.isReadByCurrentUser).toBe(true);
      expect(second.isReadByCurrentUser).toBe(false);
      expect(Object.hasOwn(first, 'reads')).toBe(false);
      expect(JSON.stringify(result.data)).not.toContain('reads');
    });

    it('adds a strict (createdAt, id) clause when the cursor message is known', async () => {
      const cursorDate = new Date('2026-01-01T09:00:00.000Z');
      mockedMessage.findFirst.mockResolvedValueOnce({ createdAt: cursorDate, id: 'm5' } as never);
      mockedMessage.findMany.mockResolvedValueOnce([] as never);

      await getRequeteMessages('REQ', 'user1', { limit: 50, before: 'm5' });

      expect(mockedMessage.findFirst).toHaveBeenCalledWith({
        where: { id: 'm5', requeteId: 'REQ' },
        select: { createdAt: true, id: true },
      });
      expect(mockedMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            requeteId: 'REQ',
            OR: [{ createdAt: { lt: cursorDate } }, { createdAt: cursorDate, id: { lt: 'm5' } }],
          },
        }),
      );
    });

    it('breaks a createdAt tie on the id so no message is skipped or served twice', async () => {
      const sharedDate = new Date('2026-01-01T09:00:00.000Z');
      const table = [
        row({ id: 'm3', createdAt: sharedDate }),
        row({ id: 'm2', createdAt: sharedDate }),
        row({ id: 'm1', createdAt: sharedDate }),
      ];
      type CursorClause = { createdAt: { lt: Date } } | { createdAt: Date; id: { lt: string } };
      type FindManyArgs = { where: { OR?: CursorClause[] }; take: number };
      const matches = (message: (typeof table)[number], clause: CursorClause) =>
        'id' in clause
          ? message.createdAt.getTime() === clause.createdAt.getTime() && message.id < clause.id.lt
          : message.createdAt < clause.createdAt.lt;
      mockedMessage.findMany.mockImplementation((({ where, take }: FindManyArgs) =>
        Promise.resolve(
          table.filter((message) => !where.OR || where.OR.some((clause) => matches(message, clause))).slice(0, take),
        )) as never);

      const firstPage = await getRequeteMessages('REQ', 'user1', { limit: 2 });

      expect(firstPage.data.map((message) => message.id)).toEqual(['m3', 'm2']);
      expect(firstPage.meta).toEqual({ hasMore: true, nextCursor: 'm2' });

      mockedMessage.findFirst.mockResolvedValueOnce({ createdAt: sharedDate, id: 'm2' } as never);
      const secondPage = await getRequeteMessages('REQ', 'user1', { limit: 2, before: 'm2' });

      expect(secondPage.data.map((message) => message.id)).toEqual(['m1']);
      expect(secondPage.meta).toEqual({ hasMore: false, nextCursor: null });
    });

    it('ignores an unknown cursor instead of filtering on it', async () => {
      mockedMessage.findFirst.mockResolvedValueOnce(null as never);
      mockedMessage.findMany.mockResolvedValueOnce([] as never);

      await getRequeteMessages('REQ', 'user1', { limit: 50, before: 'unknown' });

      expect(mockedMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requeteId: 'REQ' } }));
    });
  });

  describe('getRequeteMessageById()', () => {
    it('returns the mapped message', async () => {
      mockedMessage.findUnique.mockResolvedValueOnce(row({ reads: [{ userId: 'user1' }] }) as never);

      const result = await getRequeteMessageById('m1', 'user1');

      expect(mockedMessage.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'm1' } }));
      expect(result).toMatchObject({ id: 'm1', isReadByCurrentUser: true });
      expect(Object.hasOwn(result ?? {}, 'reads')).toBe(false);
    });

    it('returns null when the message does not exist', async () => {
      mockedMessage.findUnique.mockResolvedValueOnce(null as never);

      await expect(getRequeteMessageById('m1', 'user1')).resolves.toBeNull();
    });
  });

  describe('createRequeteMessage()', () => {
    beforeEach(() => {
      mockedMessage.create.mockResolvedValue({ id: 'm1' } as never);
      mockedMessage.findUnique.mockResolvedValue(row() as never);
      mockedMessage.findMany.mockResolvedValue([] as never);
    });

    it('creates the message and marks it read for its author', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([{ id: 'm1' }] as never);

      const result = await createRequeteMessage('REQ', 'e1', 'user1', { contenu: 'Bonjour' }, logger);

      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(mockedMessage.create).toHaveBeenCalledWith({
        data: { requeteId: 'REQ', entiteId: 'e1', authorId: 'user1', contenu: 'Bonjour' },
      });
      expect(mockedMessageRead.createMany).toHaveBeenCalledWith({
        data: [{ messageId: 'm1', userId: 'user1', entiteId: 'e1' }],
        skipDuplicates: true,
      });
      expect(result).toMatchObject({ id: 'm1' });
    });

    it('takes the message down with it when the thread cannot be marked read', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([{ id: 'm1' }] as never);
      mockedMessageRead.createMany.mockRejectedValueOnce(new Error('DATABASE_FAILURE'));

      await expect(createRequeteMessage('REQ', 'e1', 'user1', { contenu: 'Bonjour' }, logger)).rejects.toThrow(
        'DATABASE_FAILURE',
      );

      // The read rows are written inside the transaction that created the message: nothing is committed.
      expect(mockedMessage.findUnique).not.toHaveBeenCalled();
    });

    it('takes the message down with it when it cannot be read back', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([{ id: 'm1' }] as never);
      mockedMessage.findUnique.mockRejectedValueOnce(new Error('DATABASE_FAILURE'));

      await expect(createRequeteMessage('REQ', 'e1', 'user1', { contenu: 'Bonjour' }, logger)).rejects.toThrow(
        'DATABASE_FAILURE',
      );

      // The answer is built inside the transaction: an error means nothing was committed.
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('marks everything the author had not read yet: replying counts as reading', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([{ id: 'older' }] as never);

      await createRequeteMessage('REQ', 'e1', 'user1', { contenu: 'Bonjour' }, logger);

      expect(mockedMessage.findMany).toHaveBeenCalledWith({
        where: { requeteId: 'REQ', reads: { none: { userId: 'user1' } } },
        select: { id: true },
      });
      expect(mockedMessageRead.createMany).toHaveBeenCalledWith({
        data: [{ messageId: 'older', userId: 'user1', entiteId: 'e1' }],
        skipDuplicates: true,
      });
    });
  });

  describe('markAllMessagesAsRead()', () => {
    it('marks every unread message of the requete and skips duplicated read rows', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }] as never);
      mockedMessage.count.mockResolvedValueOnce(0 as never);

      const result = await markAllMessagesAsRead('REQ', 'user1', 'e1');

      // Scoped to the requete and to the caller: no id comes from the client anymore.
      expect(mockedMessage.findMany).toHaveBeenCalledWith({
        where: { requeteId: 'REQ', reads: { none: { userId: 'user1' } } },
        select: { id: true },
      });
      expect(mockedMessageRead.createMany).toHaveBeenCalledWith({
        data: [
          { messageId: 'm1', userId: 'user1', entiteId: 'e1' },
          { messageId: 'm2', userId: 'user1', entiteId: 'e1' },
        ],
        skipDuplicates: true,
      });
      expect(result).toEqual({ markedIds: ['m1', 'm2'], unreadCount: 0 });
    });

    it('stays a no-op when everything was already read but still returns the unread count', async () => {
      mockedMessage.findMany.mockResolvedValueOnce([] as never);
      mockedMessage.count.mockResolvedValueOnce(0 as never);

      const result = await markAllMessagesAsRead('REQ', 'user1', 'e1');

      expect(mockedMessageRead.createMany).not.toHaveBeenCalled();
      expect(result).toEqual({ markedIds: [], unreadCount: 0 });
    });
  });

  describe('getUnreadCount()', () => {
    it('counts the messages of the requete without a read row for the user', async () => {
      mockedMessage.count.mockResolvedValueOnce(4 as never);

      await expect(getUnreadCount('REQ', 'user1')).resolves.toBe(4);
      expect(mockedMessage.count).toHaveBeenCalledWith({
        where: { requeteId: 'REQ', reads: { none: { userId: 'user1' } } },
      });
    });
  });
});
