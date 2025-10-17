import { ALLOWED_EXTENSIONS } from './fileValidation';

export interface FileWithMetadata {
  id: string;
  fileName: string;
  size: number;
  metadata?: unknown;
}

export interface FileInfo {
  id: string;
  fileName: string;
  size: number;
}

export function getOriginalFileName(file: FileWithMetadata): string {
  const metadata = file.metadata as { originalName?: string } | null | undefined;
  return metadata?.originalName || file.fileName;
}

export function formatFileFromServer(file: FileWithMetadata): FileInfo {
  return {
    id: file.id,
    fileName: getOriginalFileName(file),
    size: file.size,
  };
}

export function formatFilesFromServer(files: FileWithMetadata[] | undefined): FileInfo[] | undefined {
  return files?.length ? files.map(formatFileFromServer) : undefined;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 octet';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export const ACCEPTED_FILE_TYPES = ALLOWED_EXTENSIONS.join(',');

export const FILE_UPLOAD_HINT =
  'Taille maximale: 10 Mo. Formats supportés: PDF, EML, Word, Excel, PowerPoint, OpenOffice, MSG, CSV, TXT, images (PNG, JPEG, HEIC, WEBP, TIFF)';
