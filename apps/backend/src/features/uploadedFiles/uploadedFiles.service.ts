import { sseEventManager } from '@/helpers/sse';
import { type Prisma, prisma, type UploadedFile } from '@/libs/prisma';
import type { CreateUploadedFileDto, GetUploadedFilesQuery } from './uploadedFiles.type';

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
) => {
  await prisma.uploadedFile.updateMany({
    where: { id: { in: uploadedFileIds } },
    data: { ...relationData, status: 'COMPLETED', entiteId } as Prisma.UploadedFileUpdateManyMutationInput,
  });

  return prisma.uploadedFile.findMany({ where: { id: { in: uploadedFileIds } } });
};

export const setNoteFile = async (
  noteId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
) => {
  return updateFilesWithRelation(uploadedFileId, { requeteEtapeNoteId: noteId }, entiteId);
};

export const setRequeteFile = async (
  requeteId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
) => {
  return updateFilesWithRelation(uploadedFileId, { requeteId }, entiteId);
};

export const setFaitFiles = async (faitSituationId: string, uploadedFileId: UploadedFile['id'][], entiteId: string) => {
  return updateFilesWithRelation(uploadedFileId, { faitSituationId }, entiteId);
};

export const setDemarchesEngageesFiles = async (
  demarchesEngageesId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
) => {
  return updateFilesWithRelation(uploadedFileId, { demarchesEngageesId }, entiteId);
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
        { scanStatus: 'PENDING' },
      ],
    },
  });
};

export const tryAcquireProcessingLock = async (fileId: string): Promise<boolean> => {
  const stuckThreshold = new Date(Date.now() - PROCESSING_TIMEOUT_MS);

  const result = await prisma.uploadedFile.updateMany({
    where: {
      id: fileId,
      OR: [{ status: 'PENDING' }, { status: 'PROCESSING', updatedAt: { lt: stuckThreshold } }],
    },
    data: {
      status: 'PROCESSING',
      scanStatus: 'SCANNING',
    },
  });

  return result.count > 0;
};
