import { ACKNOWLEDGMENT_SEND_MODES, REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES } from '@sirena/common/constants';
import { pick } from '../../helpers/object.js';
import { sseEventManager } from '../../helpers/sse.js';
import { type Prisma, prisma, type UploadedFile } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import type { CreateUploadedFileDto } from './uploadedFiles.type.js';

export type UploadedFileByIdResult = UploadedFile | null;
export type UploadedFileCreateResult = UploadedFile;
export type UploadedFileDeleteResult = UploadedFile;

const filterByEntities = (entiteIds: string[] | null): Prisma.UploadedFileWhereInput | null => {
  if (!entiteIds) return null;
  return { entiteId: { in: entiteIds } };
};

export const getUploadedFileById = async (
  id: UploadedFile['id'],
  entiteIds: string[] | null = null,
): Promise<UploadedFileByIdResult> => {
  const entiteFilter = filterByEntities(entiteIds);

  return prisma.uploadedFile.findFirst({
    where: {
      id,
      ...(entiteFilter ?? {}),
    },
  });
};

export const getRequeteEtapeUploadedFile = async (
  requeteEtapeId: string,
  fileId: UploadedFile['id'],
): Promise<UploadedFileByIdResult> =>
  prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      requeteEtapeId,
    },
  });

export const getUploadedFileByIdForEntite = async (
  id: UploadedFile['id'],
  topEntiteId: string,
): Promise<UploadedFileByIdResult> =>
  prisma.uploadedFile.findFirst({
    where: {
      id,
      OR: [
        { entiteId: topEntiteId },
        { requeteMessage: { requete: { requeteEntites: { some: { entiteId: topEntiteId } } } } },
      ],
    },
  });

export const getRequeteMessageUploadedFile = async (
  requeteId: string,
  fileId: UploadedFile['id'],
): Promise<UploadedFileByIdResult> =>
  prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      requeteMessage: { requeteId },
    },
  });

export const deleteUploadedFile = async (id: UploadedFile['id']): Promise<UploadedFileDeleteResult> => {
  return prisma.uploadedFile.delete({ where: { id } });
};

export const isUploadedFileAttachedToImmutableAcknowledgment = async (id: UploadedFile['id']): Promise<boolean> => {
  const file = await prisma.uploadedFile.findFirst({
    where: {
      id,
      requeteEtape: {
        is: {
          type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
          OR: [
            { acknowledgmentSendMode: ACKNOWLEDGMENT_SEND_MODES.AUTOMATIC },
            {
              acknowledgmentSendMode: null,
              requete: {
                is: {
                  OR: [
                    { dematSocialId: { not: null } },
                    { sirecId: { not: null } },
                    { thirdPartyAccountId: { not: null } },
                  ],
                },
              },
              OR: [
                { statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE },
                {
                  statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
                  uploadedFiles: { some: { canDelete: false, uploadedById: null } },
                },
              ],
            },
          ],
        },
      },
    },
    select: { id: true },
  });

  return file !== null;
};

export const createUploadedFile = async (
  uploadedFileData: CreateUploadedFileDto,
): Promise<UploadedFileCreateResult> => {
  const { metadata, scanResult, ...rest } = uploadedFileData;

  return prisma.uploadedFile.create({
    data: {
      ...rest,
      metadata: metadata as Prisma.InputJsonValue,
      scanResult: scanResult as Prisma.InputJsonValue | undefined,
    },
  });
};

export class FilesNotOwnedError extends Error {
  code = 'FILES_NOT_OWNED' as const;
}

export const isUserOwner = async (
  userId: string,
  uploadedFileIds: UploadedFile['id'][],
  tx?: Prisma.TransactionClient,
): Promise<boolean> => {
  const client = tx ?? prisma;
  const count = await client.uploadedFile.count({
    where: {
      id: { in: uploadedFileIds },
      uploadedById: userId,
      // A file attached to a discussion message can no longer be moved: the caller is refused before
      // anything is written, rather than halfway through the attachment.
      requeteMessageId: null,
    },
  });

  return count === uploadedFileIds.length;
};

const updateFilesWithRelation = async (
  uploadedFileIds: UploadedFile['id'][],
  relationData: Record<string, string>,
  entiteId: string | null = null,
  changedById?: string,
  tx?: Prisma.TransactionClient,
  relationWhere?: Prisma.UploadedFileWhereInput,
) => {
  const client = tx ?? prisma;
  const filesBefore = changedById
    ? await client.uploadedFile.findMany({
        where: { id: { in: uploadedFileIds } },
        select: {
          id: true,
          requeteId: true,
          requeteEtapeId: true,
          faitSituationId: true,
          demarchesEngageesId: true,
          requeteMessageId: true,
          status: true,
          entiteId: true,
        },
      })
    : [];

  const isAttachingToMessage = 'requeteMessageId' in relationData;
  const messageImmutabilityGuard: Prisma.UploadedFileWhereInput = isAttachingToMessage
    ? {}
    : { requeteMessageId: null };

  const updatedFiles = await client.uploadedFile.updateMany({
    where: { id: { in: uploadedFileIds }, ...messageImmutabilityGuard, ...relationWhere },
    data: { ...relationData, status: 'COMPLETED', entiteId } as Prisma.UploadedFileUpdateManyMutationInput,
  });

  if (updatedFiles.count !== uploadedFileIds.length) {
    // Attaching to a message is all or nothing: a message must never be sent with part of its attachments.
    if (relationWhere || isAttachingToMessage) {
      throw new FilesNotOwnedError('FILES_NOT_OWNED');
    }

    if (!isAttachingToMessage) {
      const blockedByMessage = await client.uploadedFile.count({
        where: { id: { in: uploadedFileIds }, requeteMessageId: { not: null } },
      });
      if (blockedByMessage > 0) {
        throw new FilesNotOwnedError('FILES_NOT_OWNED');
      }
    }
  }

  const filesAfter = await client.uploadedFile.findMany({ where: { id: { in: uploadedFileIds } } });

  if (changedById) {
    for (const fileAfter of filesAfter) {
      const fileBefore = filesBefore.find((f) => f.id === fileAfter.id);
      if (fileBefore) {
        await createChangeLog(
          {
            entity: 'UploadedFile',
            entityId: fileAfter.id,
            action: ChangeLogAction.UPDATED,
            before: {
              requeteId: fileBefore.requeteId,
              requeteEtapeId: fileBefore.requeteEtapeId,
              faitSituationId: fileBefore.faitSituationId,
              demarchesEngageesId: fileBefore.demarchesEngageesId,
              requeteMessageId: fileBefore.requeteMessageId,
              status: fileBefore.status,
              entiteId: fileBefore.entiteId,
            } as Prisma.JsonObject,
            after: {
              requeteId: fileAfter.requeteId,
              requeteEtapeId: fileAfter.requeteEtapeId,
              faitSituationId: fileAfter.faitSituationId,
              demarchesEngageesId: fileAfter.demarchesEngageesId,
              requeteMessageId: fileAfter.requeteMessageId,
              status: fileAfter.status,
              entiteId: fileAfter.entiteId,
            } as Prisma.JsonObject,
            changedById,
          },
          // The changelog belongs to the same transaction as the attachment it describes.
          tx,
        );
      }
    }
  }

  return filesAfter;
};

export const UNATTACHED_FILE_RELATIONS = {
  requeteId: null,
  requeteEtapeId: null,
  faitSituationId: null,
  demarchesEngageesId: null,
  requeteMessageId: null,
} as const satisfies Prisma.UploadedFileWhereInput;

export const setEtapeFile = async (
  requeteEtapeId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null,
  changedById: string,
  tx?: Prisma.TransactionClient,
) => {
  const attachFiles = (client: Prisma.TransactionClient) =>
    updateFilesWithRelation(uploadedFileId, { requeteEtapeId }, entiteId, changedById, client, {
      uploadedById: changedById,
      entiteId,
      ...UNATTACHED_FILE_RELATIONS,
    });

  return tx ? attachFiles(tx) : prisma.$transaction(attachFiles);
};

export const setMessageFiles = async (
  requeteMessageId: string,
  uploadedFileIds: UploadedFile['id'][],
  entiteId: string,
  changedById: string,
  tx?: Prisma.TransactionClient,
) => {
  const attachFiles = (client: Prisma.TransactionClient) =>
    updateFilesWithRelation(uploadedFileIds, { requeteMessageId }, entiteId, changedById, client, {
      uploadedById: changedById,
      entiteId,
      ...UNATTACHED_FILE_RELATIONS,
    });

  return tx ? attachFiles(tx) : prisma.$transaction(attachFiles);
};

export const setRequeteFile = async (
  requeteId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
  changedById?: string,
  tx?: Prisma.TransactionClient,
) => {
  const attachFiles = (client: Prisma.TransactionClient) =>
    updateFilesWithRelation(uploadedFileId, { requeteId }, entiteId, changedById, client);

  // Without a transaction, a batch holding one file already attached to a message kept the rows the
  // update did manage to move before the refusal.
  return tx ? attachFiles(tx) : prisma.$transaction(attachFiles);
};

export const setFaitFiles = async (
  faitSituationId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string,
  changedById?: string,
  tx?: Prisma.TransactionClient,
) => {
  return updateFilesWithRelation(uploadedFileId, { faitSituationId }, entiteId, changedById, tx);
};

const uploadedFileChangelogTrackedFields: (keyof UploadedFile)[] = [
  'id',
  'fileName',
  'filePath',
  'mimeType',
  'size',
  'status',
  'metadata',
  'entiteId',
  'uploadedById',
  'requeteEtapeId',
  'requeteId',
  'faitSituationId',
  'demarchesEngageesId',
  'requeteMessageId',
];

/**
 * Deletes uploaded files that were removed from a situation (not in keepFileIds).
 */
export const deleteFaitFilesRemovedFromSituation = async (
  situationId: string,
  keepFileIds: string[],
  userTopEntiteId: string,
  changedById: string | undefined,
  tx: Prisma.TransactionClient,
): Promise<{ filePaths: string[] }> => {
  const toRemove = await tx.uploadedFile.findMany({
    where:
      keepFileIds.length > 0
        ? {
            faitSituationId: situationId,
            entiteId: userTopEntiteId,
            canDelete: true,
            requeteMessageId: null,
            id: { notIn: keepFileIds },
          }
        : { faitSituationId: situationId, entiteId: userTopEntiteId, canDelete: true, requeteMessageId: null },
    select: {
      id: true,
      filePath: true,
      fileName: true,
      mimeType: true,
      size: true,
      status: true,
      metadata: true,
      entiteId: true,
      uploadedById: true,
      requeteEtapeId: true,
      requeteId: true,
      faitSituationId: true,
      demarchesEngageesId: true,
      requeteMessageId: true,
    },
  });

  const filePaths = toRemove.map((f) => f.filePath);

  for (const file of toRemove) {
    if (changedById) {
      const beforePicked = pick(
        file as Pick<UploadedFile, (typeof uploadedFileChangelogTrackedFields)[number]>,
        uploadedFileChangelogTrackedFields,
      );
      await createChangeLog({
        entity: 'UploadedFile',
        entityId: file.id,
        action: ChangeLogAction.DELETED,
        before: beforePicked as unknown as Prisma.JsonObject,
        after: null,
        changedById,
      });
    }
  }

  if (toRemove.length > 0) {
    await tx.uploadedFile.deleteMany({
      where: { id: { in: toRemove.map((f) => f.id) } },
    });
  }

  return { filePaths };
};

export const isFileBelongsToRequete = async (fileId: UploadedFile['id'], requeteId: string): Promise<boolean> => {
  const exists = await prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      OR: [
        { requeteId },
        { fait: { situation: { requeteId } } },
        { requeteEtape: { requeteId } },
        { requeteMessage: { requeteId } },
        { demarchesEngagees: { Situation: { some: { requeteId } } } },
      ],
    },
    select: { id: true },
  });

  return exists !== null;
};

export type FileProcessingStatus = {
  scanStatus?: string;
  sanitizeStatus?: string;
  safeFilePath?: string | null;
  scanResult?: Prisma.InputJsonValue;
  processingError?: string | null;
  status?: string;
};

export const attachSafeFileEncryption = async (
  id: UploadedFile['id'],
  encryptionSafe: { iv: string; authTag: string },
): Promise<void> => {
  const current = await prisma.uploadedFile.findUniqueOrThrow({
    where: { id },
    select: { metadata: true },
  });
  const currentMeta = (current.metadata as Prisma.JsonObject | null) ?? {};
  await prisma.uploadedFile.update({
    where: { id },
    data: {
      metadata: { ...currentMeta, encryptionSafe } as Prisma.InputJsonValue,
    },
  });
};

export const updateFileProcessingStatus = async (
  id: UploadedFile['id'],
  updates: FileProcessingStatus,
): Promise<UploadedFile> => {
  const file = await prisma.uploadedFile.update({
    where: { id },
    data: updates,
  });

  sseEventManager.emitFileStatus({
    fileId: file.id,
    entiteId: file.entiteId,
    status: file.status,
    scanStatus: file.scanStatus,
    sanitizeStatus: file.sanitizeStatus,
  });

  return file;
};

export const getUploadedFileByIdInternal = async (id: UploadedFile['id']): Promise<UploadedFileByIdResult> => {
  return prisma.uploadedFile.findUnique({ where: { id } });
};

const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const getUnprocessedFiles = async (): Promise<UploadedFile[]> => {
  const stuckThreshold = new Date(Date.now() - PROCESSING_TIMEOUT_MS);

  return prisma.uploadedFile.findMany({
    where: {
      OR: [
        { status: 'PENDING' },
        { status: 'PROCESSING', updatedAt: { lt: stuckThreshold } },
        {
          status: { in: ['COMPLETED', 'FAILED'] },
          scanStatus: { in: ['PENDING', 'ERROR'] },
        },
      ],
    },
  });
};

export const tryAcquireProcessingLock = async (fileId: string): Promise<boolean> => {
  const stuckThreshold = new Date(Date.now() - PROCESSING_TIMEOUT_MS);

  const result = await prisma.uploadedFile.updateMany({
    where: {
      id: fileId,
      OR: [
        { status: 'PENDING' },
        { status: 'PROCESSING', updatedAt: { lt: stuckThreshold } },
        {
          status: { in: ['COMPLETED', 'FAILED'] },
          scanStatus: { in: ['PENDING', 'ERROR'] },
        },
      ],
    },
    data: {
      status: 'PROCESSING',
      scanStatus: 'SCANNING',
    },
  });

  return result.count > 0;
};

export const getFileQueueDepth = async (): Promise<{ pending: number; stuck: number }> => {
  const stuckThreshold = new Date(Date.now() - PROCESSING_TIMEOUT_MS);

  const [pending, stuck] = await Promise.all([
    prisma.uploadedFile.count({
      where: { status: 'PENDING' },
    }),
    prisma.uploadedFile.count({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: stuckThreshold },
      },
    }),
  ]);

  return { pending, stuck };
};
