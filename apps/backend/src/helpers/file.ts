import { Readable } from 'node:stream';
import { fileTypeFromBuffer } from 'file-type';
import type { Context } from 'hono';
import { stream as honoStream } from 'hono/streaming';
import { MAX_FILE_SIZE } from '@/config/files.constant';
import { getFileStream } from '@/libs/minio';
import type { Prisma, UploadedFile } from '@/libs/prisma';

export const sanitizeFilename = (originalName: string, detectedExtension: string): string => {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');

  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();

  return `${sanitizedName}.${detectedExtension}`;
};

export const urlToStream = async (url: string, maxSize = MAX_FILE_SIZE) => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }

  const sizeHdr = res.headers.get('content-length');
  const size = sizeHdr ? Number(sizeHdr) : undefined;
  if (size && size > maxSize) {
    throw new Error(
      `File too large: ${(size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  const sniff = await fileTypeFromBuffer(buffer);

  const mimeSniffed = sniff?.mime;

  const mimeFromHeader = res.headers.get('content-type');

  const node = Readable.from(buffer);

  return {
    stream: node,
    size: size ?? undefined,
    mimeFromHeader,
    mimeSniffed,
    extSniffed: sniff?.ext,
  };
};

export const getOriginalFileName = (file: UploadedFile): string => {
  const metadata = file.metadata as Prisma.JsonObject | null;
  return metadata?.originalName?.toString() || file.fileName;
};

interface StreamFileOptions {
  filePath: string;
  fileName: string;
  contentType: string;
  fileId: string;
}

const createFileStreamResponse = async (c: Context, options: StreamFileOptions) => {
  const logger = c.get('logger');
  const { filePath, fileName, contentType, fileId } = options;

  c.header('Content-Type', contentType);
  c.header('Content-Disposition', `inline; filename="${fileName}"`);

  return honoStream(c, async (s) => {
    try {
      const { stream: nodeStream } = await getFileStream(filePath);
      const webStream = Readable.toWeb(nodeStream);

      s.onAbort(() => {
        if ('destroy' in nodeStream) {
          nodeStream.destroy();
        }
      });

      await s.pipe(webStream);
    } catch (error) {
      logger.error({ error, fileId, filePath }, 'Error streaming file');
      throw error;
    }
  });
};

export const streamFileResponse = async (c: Context, file: UploadedFile) => {
  if (file.size === 0) {
    c.header('Content-Type', file.mimeType || 'application/octet-stream');
    c.header('Content-Disposition', `inline; filename="${getOriginalFileName(file)}"`);
    return c.body(null, 200);
  }

  return createFileStreamResponse(c, {
    filePath: file.filePath,
    fileName: getOriginalFileName(file),
    contentType: file.mimeType || 'application/octet-stream',
    fileId: file.id,
  });
};

export const streamSafeFileResponse = async (c: Context, file: UploadedFile) => {
  if (!file.safeFilePath) {
    throw new Error('Safe file path not available');
  }

  return createFileStreamResponse(c, {
    filePath: file.safeFilePath,
    fileName: `safe_${getOriginalFileName(file)}`,
    contentType: file.mimeType || 'application/octet-stream',
    fileId: file.id,
  });
};
