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
  const { metadata, ...rest } = uploadedFileData;

  return prisma.uploadedFile.create({
    data: {
      ...rest,
      metadata: metadata as Prisma.InputJsonValue,
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

export const setNoteFile = async (
  noteId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
) => {
  await prisma.uploadedFile.updateMany({
    where: { id: { in: uploadedFileId } },
    data: { requeteEtapeNoteId: noteId, status: 'COMPLETED', entiteId: entiteId },
  });

  return await prisma.uploadedFile.findMany({ where: { id: { in: uploadedFileId } } });
};

export const setRequeteFile = async (
  requeteId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
) => {
  await prisma.uploadedFile.updateMany({
    where: { id: { in: uploadedFileId } },
    data: { requeteId, status: 'COMPLETED', entiteId },
  });

  return await prisma.uploadedFile.findMany({ where: { id: { in: uploadedFileId } } });
};

export const setFaitFiles = async (
  faitSituationId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
) => {
  await prisma.uploadedFile.updateMany({
    where: { id: { in: uploadedFileId } },
    data: { faitSituationId, status: 'COMPLETED', entiteId },
  });

  return await prisma.uploadedFile.findMany({ where: { id: { in: uploadedFileId } } });
};

export const setDemarchesEngageesFiles = async (
  demarchesEngageesId: string,
  uploadedFileId: UploadedFile['id'][],
  entiteId: string | null = null,
) => {
  await prisma.uploadedFile.updateMany({
    where: { id: { in: uploadedFileId } },
    data: { demarchesEngageesId, status: 'COMPLETED', entiteId },
  });

  return await prisma.uploadedFile.findMany({ where: { id: { in: uploadedFileId } } });
};
