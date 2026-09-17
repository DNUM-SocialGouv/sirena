import type { PinoLogger } from 'hono-pino';
import { type Prisma, prisma } from '../../libs/prisma.js';
import type { GetRequeteMessagesQuery, PostRequeteMessageDto } from './requeteMessages.type.js';

const messageSelect = (currentUserId: string) =>
  ({
    id: true,
    requeteId: true,
    contenu: true,
    createdAt: true,
    entite: { select: { id: true, nomComplet: true, entiteTypeId: true } },
    author: { select: { prenom: true, nom: true } },
    reads: { where: { userId: currentUserId }, select: { userId: true }, take: 1 },
  }) satisfies Prisma.RequeteMessageSelect;

type MessageRow = Prisma.RequeteMessageGetPayload<{ select: ReturnType<typeof messageSelect> }>;

const toMessageDto = ({ reads, ...rest }: MessageRow) => ({ ...rest, isReadByCurrentUser: reads.length > 0 });

export type RequeteMessageDto = ReturnType<typeof toMessageDto>;

export const getRequeteMessageById = async (id: string, currentUserId: string): Promise<RequeteMessageDto | null> => {
  const row = await prisma.requeteMessage.findUnique({ where: { id }, select: messageSelect(currentUserId) });
  return row ? toMessageDto(row) : null;
};

type MessageCursor = { createdAt: Date; id: string };

const cursorClause = (cursor: MessageCursor): Prisma.RequeteMessageWhereInput => ({
  OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }],
});

export const getRequeteMessages = async (requeteId: string, currentUserId: string, query: GetRequeteMessagesQuery) => {
  const { limit, before } = query;
  const cursor = before
    ? await prisma.requeteMessage.findFirst({
        where: { id: before, requeteId },
        select: { createdAt: true, id: true },
      })
    : null;

  const where: Prisma.RequeteMessageWhereInput = {
    requeteId,
    ...(cursor ? cursorClause(cursor) : {}),
  };

  const rows = await prisma.requeteMessage.findMany({
    where,
    select: messageSelect(currentUserId),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    data: page.map(toMessageDto),
    meta: { hasMore, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null },
  };
};

const unreadWhere = (userId: string, extra: Prisma.RequeteMessageWhereInput): Prisma.RequeteMessageWhereInput => ({
  ...extra,
  reads: { none: { userId } },
});

export const getUnreadCount = (requeteId: string, userId: string): Promise<number> =>
  prisma.requeteMessage.count({ where: unreadWhere(userId, { requeteId }) });

export const markAllMessagesAsRead = async (requeteId: string, userId: string, entiteId: string) => {
  const unread = await prisma.requeteMessage.findMany({
    where: unreadWhere(userId, { requeteId }),
    select: { id: true },
  });
  const markedIds = unread.map((message) => message.id);

  if (markedIds.length > 0) {
    await prisma.requeteMessageRead.createMany({
      data: markedIds.map((messageId) => ({ messageId, userId, entiteId })),
      skipDuplicates: true,
    });
  }

  return { markedIds, unreadCount: await getUnreadCount(requeteId, userId) };
};

export const createRequeteMessage = async (
  requeteId: string,
  entiteId: string,
  userId: string,
  dto: PostRequeteMessageDto,
  logger: PinoLogger,
): Promise<RequeteMessageDto | null> => {
  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.requeteMessage.create({
      data: { requeteId, entiteId, authorId: userId, contenu: dto.contenu },
    });

    await tx.requeteMessageRead.create({ data: { messageId: message.id, userId, entiteId } });

    return message;
  });

  logger.info({ requeteId, messageId: created.id, userId }, 'Requete message persisted');

  await markAllMessagesAsRead(requeteId, userId, entiteId);

  return getRequeteMessageById(created.id, userId);
};
