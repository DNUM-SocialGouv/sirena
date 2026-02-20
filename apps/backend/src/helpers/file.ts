import { Readable } from 'node:stream';
import { fileTypeFromBuffer } from 'file-type';
import type { Context } from 'hono';
import { stream as honoStream } from 'hono/streaming';
import { MAX_FILE_SIZE } from '../config/files.constant.js';
import { getFileStream } from '../libs/minio.js';
import type { Prisma, UploadedFile } from '../libs/prisma.js';

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

const removeControlChars = (value: string) =>
  Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f;
    })
    .join('');

const escapeQuotedString = (value: string) => value.replaceAll('\\', '_').replaceAll('"', '_');

const isLatin1 = (value: string) => {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0xff) {
      return false;
    }
  }
  return true;
};

const toAsciiFallbackFilename = (value: string) => {
  const withoutDiacritics = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const asciiSafe = withoutDiacritics
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return asciiSafe || 'file';
};

const encodeRFC5987Value = (value: string) =>
  encodeURIComponent(value)
    .replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%(7C|60|5E)/g, (sequence) => sequence.toLowerCase());

export const createInlineContentDisposition = (rawFileName: string) => {
  const cleaned =
    removeControlChars(rawFileName)
      .replace(/[\r\n]+/g, ' ')
      .trim() || 'file';
  const quoted = escapeQuotedString(cleaned);

  if (isLatin1(quoted)) {
    return `inline; filename="${quoted}"`;
  }

  const asciiFallback = escapeQuotedString(toAsciiFallbackFilename(cleaned));
  const encodedUtf8Filename = encodeRFC5987Value(cleaned);

  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodedUtf8Filename}`;
};

const createFileStreamResponse = async (c: Context, options: StreamFileOptions) => {
  const logger = c.get('logger');
  const { filePath, fileName, contentType, fileId } = options;

  c.header('Content-Type', contentType);
  c.header('Content-Disposition', createInlineContentDisposition(fileName));

  return honoStream(c, async (s) => {
    try {
      const { stream: nodeStream } = await getFileStream(filePath);
      const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

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
    c.header('Content-Disposition', createInlineContentDisposition(getOriginalFileName(file)));
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
