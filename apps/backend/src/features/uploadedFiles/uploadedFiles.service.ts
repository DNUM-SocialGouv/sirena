import { pick } from '../../helpers/object.js';
import { sseEventManager } from '../../helpers/sse.js';
import { type Prisma, prisma, type UploadedFile } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import type { CreateUploadedFileDto, GetUploadedFilesQuery } from './uploadedFiles.type.js';

export type GetUploadedFilesResult = {
  data: UploadedFile[];
  total: number;
};
export type UploadedFileByIdResult = UploadedFile | null;
export type UploadedFileCreateResult = UploadedFile;
export type UploadedFileDeleteResult = UploadedFile;

const filterByEntities = (entiteIds: string[] | null): Prisma.UploadedFileWhereInput | null => {
  if (!entiteIds) return null;
  return { entiteId: { in: entiteIds } };
};

export const getUploadedFiles = async (
  entiteIds: string[] | null = null,
  query: GetUploadedFilesQuery = {},
): Promise<GetUploadedFilesResult> => {
  const { offset = 0, limit, sort = 'createdAt', order = 'desc', search, mimeType, fileName } = query;

  const entiteFilter = filterByEntities(entiteIds);

  const searchConditions: Prisma.UploadedFileWhereInput[] | undefined = search?.trim()
    ? [{ fileName: { contains: search, mode: 'insensitive' } }, { filePath: { contains: search, mode: 'insensitive' } }]
    : undefined;

  const where: Prisma.UploadedFileWhereInput = {
    ...(entiteFilter ?? {}),
    ...(mimeType ? { mimeType } : {}),
    ...(fileName ? { fileName } : {}),
    ...(searchConditions ? { OR: searchConditions } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.uploadedFile.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { [sort]: order },
    }),
    prisma.uploadedFile.count({ where }),
  ]);

  return {
    data,
    total,
  };
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

export const deleteUploadedFile = async (id: UploadedFile['id']): Promise<UploadedFileDeleteResult> => {
  return prisma.uploadedFile.delete({ where: { id } });
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

export const isUserOwner = async (userId: string, uploadedFileIds: UploadedFile['id'][]): Promise<boolean> => {
  const count = await prisma.uploadedFile.count({
    where: {
      id: { in: uploadedFileIds },
      uploadedById: userId,
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
) => {
  const client = tx ?? prisma;
  const filesBefore = changedById
    ? await client.uploadedFile.findMany({
        where: { id: { in: uploadedFileIds } },
        select: {
          id: true,
          requeteId: true,
          requeteEtapeNoteId: true,
          faitSituationId: true,
          demarchesEngageesId: true,
          status: true,
          entiteId: true,
        },
      })
    : [];

  await client.uploadedFile.updateMany({
    where: { id: { in: uploadedFileIds } },
    data: { ...relationData, status: 'COMPLETED', entiteId } as Prisma.UploadedFileUpdateManyMutationInput,
  });

  const filesAfter = await client.uploadedFile.findMany({ where: { id: { in: uploadedFileIds } } });

  if (changedById) {
    for (const fileAfter of filesAfter) {
      const fileBefore = filesBefore.find((f) => f.id === fileAfter.id);
      if (fileBefore) {
        await createChangeLog({
          entity: 'UploadedFile',
          entityId: fileAfter.id,
          action: ChangeLogAction.UPDATED,
          before: {
            requeteId: fileBefore.requeteId,
            requeteEtapeNoteId: fileBefore.requeteEtapeNoteId,
            faitSituationId: fileBefore.faitSituationId,
            demarchesEngageesId: fileBefore.demarchesEngageesId,
            status: fileBefore.status,
            entiteId: fileBefore.entiteId,
          } as Prisma.JsonObject,
          after: {
            requeteId: fileAfter.requeteId,
            requeteEtapeNoteId: fileAfter.requeteEtapeNoteId,
            faitSituationId: fileAfter.faitSituationId,
            demarchesEngageesId: fileAfter.demarchesEngageesId,
            status: fileAfter.status,
            entiteId: fileAfter.entiteId,
          } as Prisma.JsonObject,
          changedById,
        });
      }
    }
  }

  return filesAfter;
};

export const setNoteFile = async (
  noteId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
  changedById?: string,
) => {
  return updateFilesWithRelation(uploadedFileId, { requeteEtapeNoteId: noteId }, entiteId, changedById);
};

export const setRequeteFile = async (
  requeteId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
  changedById?: string,
) => {
  return updateFilesWithRelation(uploadedFileId, { requeteId }, entiteId, changedById);
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
  'requeteEtapeNoteId',
  'requeteId',
  'faitSituationId',
  'demarchesEngageesId',
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
            id: { notIn: keepFileIds },
          }
        : { faitSituationId: situationId, entiteId: userTopEntiteId, canDelete: true },
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
      requeteEtapeNoteId: true,
      requeteId: true,
      faitSituationId: true,
      demarchesEngageesId: true,
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

export const setDemarchesEngageesFiles = async (
  demarchesEngageesId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
  changedById?: string,
) => {
  return updateFilesWithRelation(uploadedFileId, { demarchesEngageesId }, entiteId, changedById);
};

export const isFileBelongsToRequete = async (fileId: UploadedFile['id'], requeteId: string): Promise<boolean> => {
  const exists = await prisma.uploadedFile.findFirst({
    where: {
      id: fileId,
      OR: [
        { requeteId },
        { fait: { situation: { requeteId } } },
        { requeteEtapeNote: { requeteEtape: { requeteId } } },
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
    processingError: file.processingError,
    safeFilePath: file.safeFilePath,
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
          scanStatus: 'PENDING',
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
          scanStatus: 'PENDING',
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
