import { Readable } from 'node:stream';
import { fileTypeFromStream } from 'file-type';
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

export const urlToStream = async (url: string) => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }

  const sizeHdr = res.headers.get('content-length');
  const size = sizeHdr ? Number(sizeHdr) : undefined;
  if (size && size > MAX_FILE_SIZE) throw new Error('File too large');

  const sniff = await fileTypeFromStream(res.body);

  const mimeSniffed = sniff?.mime;

  const mimeFromHeader = res.headers.get('content-type');

  const node = Readable.fromWeb(res.body);

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

export const streamFileResponse = async (c: Context, file: UploadedFile) => {
  const logger = c.get('logger');

  const contentType = file.mimeType || 'application/octet-stream';
  const originalName = getOriginalFileName(file);

  c.header('Content-Type', contentType);
  c.header('Content-Disposition', `inline; filename="${originalName}"`);

  if (file.size === 0) {
    return c.body(null, 200);
  }

  return honoStream(c, async (s) => {
    try {
      const nodeStream = await getFileStream(file.filePath);
      const webStream = Readable.toWeb(nodeStream);

      s.onAbort(() => {
        if ('destroy' in nodeStream) {
          nodeStream.destroy();
        }
      });

      await s.pipe(webStream);
    } catch (error) {
      logger.error({ error, fileId: file.id }, 'Error streaming file');
      throw error;
    }
  });
};
