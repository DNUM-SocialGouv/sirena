import { DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES } from '@sirena/common/constants';
import { type DocumentExportStatus, type DocumentExportType, type Prisma, prisma } from '../../libs/prisma.js';

// The download link stays valid for a fixed time after the document is generated.
export const DOCUMENT_EXPORT_TTL_MS = DOCUMENT_EXPORT_LINK_VALIDITY_MINUTES * 60 * 1000;

// A pending or processing export older than this is treated as lost (worker crash): it no
// longer blocks the user from asking for a new one.
export const DOCUMENT_EXPORT_ACTIVE_TIMEOUT_MS = 30 * 60 * 1000;

// Plain mirrors of the Prisma enums, usable where the Prisma client module is mocked.
export const DOCUMENT_EXPORT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
} as const satisfies Record<DocumentExportStatus, DocumentExportStatus>;

export const DOCUMENT_EXPORT_TYPE = {
  REQUETES_CSV: 'REQUETES_CSV',
} as const satisfies Record<DocumentExportType, DocumentExportType>;

export const findActiveDocumentExport = async (
  userId: string,
  type: DocumentExportType,
  now: Date = new Date(),
  client: Prisma.TransactionClient = prisma,
) =>
  client.documentExport.findFirst({
    where: {
      userId,
      type,
      status: { in: [DOCUMENT_EXPORT_STATUS.PENDING, DOCUMENT_EXPORT_STATUS.PROCESSING] },
      createdAt: { gt: new Date(now.getTime() - DOCUMENT_EXPORT_ACTIVE_TIMEOUT_MS) },
    },
    select: { id: true },
  });

export const createDocumentExport = async (
  data: { type: DocumentExportType; userId: string; topEntiteId: string; params: Prisma.InputJsonValue },
  client: Prisma.TransactionClient = prisma,
) =>
  client.documentExport.create({
    data: {
      type: data.type,
      params: data.params,
      topEntiteId: data.topEntiteId,
      user: { connect: { id: data.userId } },
    },
  });

export const getDocumentExportForProcessing = async (id: string) =>
  prisma.documentExport.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, prenom: true, nom: true, entiteId: true } } },
  });

export const markDocumentExportProcessing = async (id: string) =>
  prisma.documentExport.update({ where: { id }, data: { status: DOCUMENT_EXPORT_STATUS.PROCESSING, error: null } });

export const markDocumentExportReady = async (
  id: string,
  file: {
    fileName: string;
    filePath: string;
    mimeType: string;
    size: number;
    rowCount: number;
    encryption: { iv: string; authTag: string };
    generatedAt: Date;
  },
) =>
  prisma.documentExport.update({
    where: { id },
    data: {
      status: DOCUMENT_EXPORT_STATUS.READY,
      fileName: file.fileName,
      filePath: file.filePath,
      mimeType: file.mimeType,
      size: file.size,
      rowCount: file.rowCount,
      // Same shape as UploadedFile.metadata, so getFileEncryptionParams reads it.
      metadata: { encryption: file.encryption },
      generatedAt: file.generatedAt,
      expiresAt: new Date(file.generatedAt.getTime() + DOCUMENT_EXPORT_TTL_MS),
      error: null,
    },
  });

export const markDocumentExportFailed = async (id: string, error: string) =>
  prisma.documentExport.update({ where: { id }, data: { status: DOCUMENT_EXPORT_STATUS.FAILED, error } });

/** Exports whose download link has expired while their file is still stored. */
export const findExpiredDocumentExportFiles = async (now: Date, limit: number) => {
  const rows = await prisma.documentExport.findMany({
    where: { filePath: { not: null }, expiresAt: { lte: now } },
    select: { id: true, filePath: true },
    orderBy: { expiresAt: 'asc' },
    take: limit,
  });

  return rows.filter((row): row is { id: string; filePath: string } => row.filePath !== null);
};

/** To call once the files are deleted: the row stays, as the trace of the export and of its expiry. */
export const markDocumentExportsExpired = async (ids: string[]): Promise<number> => {
  if (ids.length === 0) return 0;

  const { count } = await prisma.documentExport.updateMany({
    where: { id: { in: ids } },
    data: { status: DOCUMENT_EXPORT_STATUS.EXPIRED, filePath: null },
  });
  return count;
};
