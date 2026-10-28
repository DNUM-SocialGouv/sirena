import type { Prisma, UploadedFile } from '../libs/prisma.js';

// Kept apart from file.ts, which opens the object storage client when loaded.
export const getOriginalFileName = (file: Pick<UploadedFile, 'fileName' | 'metadata'>): string => {
  const metadata = file.metadata as Prisma.JsonObject | null;
  return metadata?.originalName?.toString() || file.fileName;
};
