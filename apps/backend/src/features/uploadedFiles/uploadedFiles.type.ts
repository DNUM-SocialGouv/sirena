import type { UploadedFile } from '../../libs/prisma.js';

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
