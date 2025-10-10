import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { throwHTTPException400BadRequest } from '@sirena/backend-utils/helpers';
import { API_ERROR_CODES } from '@sirena/common/constants';
import { fileTypeFromBuffer } from 'file-type';
import { file as tmpAsync } from 'tmp-promise';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/config/files.constant';
import factoryWithUploadedFile from '@/helpers/factories/appWithUploadedFile';
import { sanitizeFilename } from '@/helpers/file';

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

  // Handle MSG files - they might be detected as x-cfb (Compound File Binary)
  // but we want to preserve the .msg extension
  if (file.name.toLowerCase().endsWith('.msg')) {
    if (detectedType?.mime === 'application/x-cfb') {
      detectedType = { mime: 'application/x-cfb', ext: 'msg' };
    } else if (!detectedType) {
      // If detection failed, assume it's a valid MSG file based on extension
      detectedType = { mime: 'application/vnd.ms-outlook', ext: 'msg' };
    }
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
