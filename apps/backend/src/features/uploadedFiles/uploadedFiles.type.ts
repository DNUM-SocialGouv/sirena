import type { z } from 'zod';
import type { UploadedFile } from '@/libs/prisma';
import type { GetUploadedFilesQuerySchema } from './uploadedFiles.schema';

export type CreateUploadedFileDto = Omit<
  UploadedFile,
  'createdAt' | 'updatedAt' | 'scanStatus' | 'sanitizeStatus' | 'safeFilePath' | 'scanResult' | 'processingError'
> & {
  scanStatus?: string;
  sanitizeStatus?: string;
  safeFilePath?: string | null;
  scanResult?: unknown;
  processingError?: string | null;
};

export type GetUploadedFilesQuery = z.infer<typeof GetUploadedFilesQuerySchema>;
