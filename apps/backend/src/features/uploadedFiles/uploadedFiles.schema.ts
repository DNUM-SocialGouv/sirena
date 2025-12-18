import { paginationQueryParamsSchema } from '@sirena/backend-utils/schemas';
import { Prisma } from '@/libs/prisma';
import { UploadedFileSchema, z } from '@/libs/zod';

export const UploadedFileParamsIdSchema = z.object({
  id: z.string(),
});

export const UploadedFileIdSchema = UploadedFileSchema.shape.id;

// DEVNOTE: known issue on zod-openapi https://github.com/samchungy/zod-openapi/issues/457
export const GetUploadedFileResponseSchema = UploadedFileSchema.omit({
  metadata: true,
});

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
