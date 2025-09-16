import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { throwHTTPException400BadRequest } from '@sirena/backend-utils/helpers';
import { API_ERROR_CODES } from '@sirena/common/constants';
import { fileTypeFromBuffer } from 'file-type';
import { file as tmpAsync } from 'tmp-promise';
import factoryWithUploadedFile from '@/helpers/factories/appWithUploadedFile';

const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',

  // EML
  'message/rfc822',

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

  // Outlook MSG
  'application/vnd.ms-outlook',
  'application/x-cfb',

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
const extractUploadedFileMiddleware = factoryWithUploadedFile.createMiddleware(async (c, next) => {
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    throwHTTPException400BadRequest('Invalid file', {
      res: c.res,
    });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_FILE_SIZE) {
    throwHTTPException400BadRequest('File size exceeds the maximum allowed', {
      cause: { name: API_ERROR_CODES.FILE_MAX_SIZE },
      res: c.res,
    });
  }

  let detectedType = await fileTypeFromBuffer(buffer);

  // Handle text-based files that fileTypeFromBuffer can't detect
  if (!detectedType && file.name.toLowerCase().endsWith('.eml')) {
    detectedType = { mime: 'text/plain', ext: 'eml' };
  }

  // Handle MSG files that fileTypeFromBuffer might not detect or detect as x-cfb
  if (!detectedType && file.name.toLowerCase().endsWith('.msg')) {
    detectedType = { mime: 'application/vnd.ms-outlook', ext: 'msg' };
  }

  if (!detectedType?.mime || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
    throwHTTPException400BadRequest(`File type "${detectedType?.mime}" is not allowed`, {
      cause: { name: API_ERROR_CODES.FILE_TYPE },
      res: c.res,
    });
  }

  const sanitizedFilename = sanitizeFilename(file.name, detectedType.ext);
  const tmpFile = await tmpAsync({
    prefix: `${randomUUID()}-`,
    postfix: `-${sanitizedFilename}`,
    discardDescriptor: true,
    mode: 0o600,
  });

  await fs.promises.writeFile(tmpFile.path, buffer);

  c.set('uploadedFile', {
    tempFilePath: tmpFile.path,
    fileName: sanitizedFilename,
    contentType: detectedType.mime,
    size: buffer.length,
  });

  await next();
});

export default extractUploadedFileMiddleware;
