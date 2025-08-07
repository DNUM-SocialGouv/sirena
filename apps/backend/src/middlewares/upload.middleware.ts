import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { throwHTTPException400BadRequest } from '@sirena/backend-utils/helpers';
import { fileTypeFromBuffer } from 'file-type';
import { HTTPException } from 'hono/http-exception';
import factoryWithAuth from '@/helpers/factories/appWithAuth';

const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',

  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // OpenOffice / LibreOffice
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',

  // CSV / TXT
  'text/csv',
  'text/plain',

  // Images
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/tiff',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const sanitizeFilename = (originalName: string, detectedExtension: string): string => {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');

  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();

  return `${sanitizedName}.${detectedExtension}`;
};

/**
 * @description Extracts the uploaded file from the request body and sets it in the context. You must delete the temp file in the controller.
 */
export const extractUploadedFileMiddleware = factoryWithAuth.createMiddleware(async (c, next) => {
  const body = await c.req.parseBody();
  const logger = c.get('logger');
  const file = body.file;

  if (!(file instanceof File)) {
    throwHTTPException400BadRequest('Invalid file', {
      res: c.res,
    });
  }

  const tempDir = os.tmpdir();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      throwHTTPException400BadRequest('File size exceeds the maximum allowed', { res: c.res });
    }

    const detectedType = await fileTypeFromBuffer(buffer);

    if (!detectedType?.mime || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      throwHTTPException400BadRequest(`File type "${detectedType?.mime}" is not allowed`, { res: c.res });
    }

    const sanitizedFilename = sanitizeFilename(file.name, detectedType.ext);
    const tempFilePath = path.join(tempDir, `${randomUUID()}-${Date.now()}-${sanitizedFilename}`);

    await fs.promises.writeFile(tempFilePath, buffer);

    c.set('uploadedFile', {
      tempFilePath,
      fileName: sanitizedFilename,
      contentType: detectedType.mime,
      size: buffer.length,
    });

    await next();
  } catch (err) {
    if (err instanceof HTTPException) {
      throw err;
    } else {
      logger.error({ err }, 'Error extracting uploaded file:');
      return c.json({ message: 'Internal server error' }, 500);
    }
  }
});
