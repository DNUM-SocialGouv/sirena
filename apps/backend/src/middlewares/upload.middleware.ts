import { throwHTTPException400BadRequest } from '@sirena/backend-utils/helpers';
import { API_ERROR_CODES } from '@sirena/common/constants';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../config/files.constant.js';
import factoryWithUploadedFile from '../helpers/factories/appWithUploadedFile.js';
import { fileTypeParser, sanitizeFilename } from '../helpers/file.js';

/**
 * @description Extracts the uploaded file from the request body and sets it in the context.
 * The file is kept in memory as a Buffer - no temp files are created.
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

  let detectedType = await fileTypeParser.fromBuffer(buffer);

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
      detectedType = { mime: 'application/vnd.ms-outlook', ext: 'msg' };
    }
  }

  // Office Open XML files (.docx, .xlsx, .pptx) are ZIP-based and file-type may misdetect them as application/zip
  // Issue to track : https://github.com/sindresorhus/file-type/issues/785
  if (detectedType?.mime === 'application/zip') {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const zipBasedMimeTypes: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      odp: 'application/vnd.oasis.opendocument.presentation',
    };
    if (ext && ext in zipBasedMimeTypes) {
      detectedType = { mime: zipBasedMimeTypes[ext], ext };
    }
  }

  // Fallback when file-type cannot detect (e.g. some Office, CSV, or text files): use browser-provided type if allowed
  if (!detectedType?.mime && file.type && ALLOWED_MIME_TYPES.includes(file.type)) {
    const ext = file.name.includes('.') ? (file.name.split('.').pop()?.toLowerCase() ?? 'bin') : 'bin';
    detectedType = { mime: file.type, ext };
  }

  if (!detectedType?.mime || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
    throwHTTPException400BadRequest(`File type "${detectedType?.mime ?? 'unknown'}" is not allowed`, {
      cause: { name: API_ERROR_CODES.FILE_TYPE },
      res: c.res,
    });
  }

  const sanitizedFilename = sanitizeFilename(file.name, detectedType.ext);

  c.set('uploadedFile', {
    buffer,
    fileName: sanitizedFilename,
    contentType: detectedType.mime,
    size: buffer.length,
  });

  await next();
});

export default extractUploadedFileMiddleware;
