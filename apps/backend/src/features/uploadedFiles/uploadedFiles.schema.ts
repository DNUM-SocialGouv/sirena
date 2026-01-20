import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import * as z from 'zod';
import { Prisma } from '../../libs/prisma.js';

export const UploadedFileSchema = z.object({
  id: z.uuid(),
  fileName: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  status: z.string(),
  canDelete: z.boolean(),
  scanStatus: z.string(),
  sanitizeStatus: z.string(),
  safeFilePath: z.string().nullable(),
  scanResult: z.record(z.string(), z.string()).nullable(),
  processingError: z.string().nullable(),
  metadata: z.record(z.string(), z.string()).nullable(),
  entiteId: z.string().nullable(),
  uploadedById: z.string().nullable(),
  requeteEtapeNoteId: z.string().nullable(),
  requeteId: z.string().nullable(),
  faitSituationId: z.string().nullable(),
  demarchesEngageesId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UploadedFileParamsIdSchema = UploadedFileSchema.pick({
  id: true,
});

export const GetUploadedFileResponseSchema = UploadedFileSchema;

export const GetUploadedFilesResponseSchema = z.array(
  UploadedFileSchema.omit({
    metadata: true,
  }),
);

const columns = [
  Prisma.UploadedFileScalarFieldEnum.fileName,
  Prisma.UploadedFileScalarFieldEnum.filePath,
  Prisma.UploadedFileScalarFieldEnum.mimeType,
] as const;

export const GetUploadedFilesQuerySchema = paginationQueryParamsSchema(columns).extend({
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
});

export const FileProcessingStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  scanStatus: z.string(),
  sanitizeStatus: z.string(),
  processingError: z.string().nullable(),
  safeFilePath: z.string().nullable(),
});

export const GetFileProcessingStatusResponseSchema = z.object({
  data: FileProcessingStatusSchema,
});
