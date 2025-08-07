import type { UploadedFile } from '@/libs/prisma';
import type { z } from '@/libs/zod';
import type { GetUploadedFilesQuerySchema } from './uploadedFiles.schema';

export type CreateUploadedFileDto = Omit<UploadedFile, 'id' | 'createdAt' | 'updatedAt'>;

export type GetUploadedFilesQuery = z.infer<typeof GetUploadedFilesQuerySchema>;
