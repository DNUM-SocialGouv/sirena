import type { IncomingMessage } from 'node:http';
import { type Readable, Transform } from 'node:stream';
import { Busboy, type BusboyFileStream } from '@fastify/busboy';
import { throwHTTPException400BadRequest } from '@sirena/backend-utils/helpers';
import { API_ERROR_CODES, ERROR_KIND } from '@sirena/common/constants';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../config/files.constant.js';
import factoryWithUploadedFile, { type UploadedFileContext } from '../helpers/factories/appWithUploadedFile.js';
import { fileTypeParser, sanitizeFilename } from '../helpers/file.js';

const SNIFF_SIZE = 4096;

class FileSizeExceededError extends Error {
  constructor() {
    super('File size exceeds the maximum allowed');
    this.name = 'FileSizeExceededError';
  }
}

const createSizeLimiter = (maxSize: number) => {
  let total = 0;
  const transform = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      total += chunk.length;
      if (total > maxSize) {
        cb(new FileSizeExceededError());
        return;
      }
      cb(null, chunk);
    },
  });
  return Object.assign(transform, { getBytesRead: () => total });
};

interface ParsedFilePart {
  fileStream: BusboyFileStream;
  filename: string;
  mimeType: string;
}

/**
 * Pipes the incoming request into busboy and resolves with the first file
 * part as soon as busboy emits it. Subsequent file parts (if any) are
 * drained to keep busboy unblocked.
 */
const parseFirstFile = (req: IncomingMessage): Promise<ParsedFilePart> =>
  new Promise((resolve, reject) => {
    let bb: Busboy;
    try {
      // The size limiter Transform (downstream) is the authoritative check.
      // We set busboy's fileSize one byte higher so an over-limit upload
      // surfaces as a Transform error rather than a silent truncation.
      bb = Busboy({
        headers: req.headers as { 'content-type': string } & typeof req.headers,
        limits: { fileSize: MAX_FILE_SIZE + 1, files: 1 },
      });
    } catch (err) {
      reject(err as Error);
      return;
    }

    let settled = false;

    bb.on('file', (_fieldname, fileStream, filename, _encoding, mimeType) => {
      if (settled) {
        fileStream.resume();
        return;
      }
      settled = true;
      resolve({ fileStream, filename, mimeType });
    });

    bb.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err as Error);
    });

    bb.on('finish', () => {
      if (settled) return;
      settled = true;
      reject(new Error('No file part in multipart body'));
    });

    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });

    req.pipe(bb);
  });

/**
 * Reads the first `sniffSize` bytes from `source` (without dropping them)
 * and returns the sampled head plus a Readable that emits head + remainder.
 * Backpressure is preserved: downstream consumption drives upstream reads.
 */
const sampleHead = async (source: Readable, sniffSize: number) => {
  source.pause();
  const iter = source.iterator({ destroyOnReturn: false }) as AsyncIterator<Buffer>;

  const chunks: Buffer[] = [];
  let collected = 0;
  let upstreamDone = false;

  while (collected < sniffSize) {
    const { value, done } = await iter.next();
    if (done) {
      upstreamDone = true;
      break;
    }
    chunks.push(value);
    collected += value.length;
  }

  const head = Buffer.concat(chunks);

  async function* reassemble(): AsyncGenerator<Buffer> {
    if (head.length > 0) yield head;
    if (upstreamDone) return;
    while (true) {
      const { value, done } = await iter.next();
      if (done) return;
      yield value;
    }
  }

  // We intentionally don't materialise `reassemble()` as a Readable here —
  // the caller wraps it with the size limiter pipeline.
  return { head, remainderIterator: reassemble() };
};

const resolveMimeType = async (
  head: Buffer,
  filename: string,
  browserType: string | undefined,
): Promise<{ mime: string; ext: string } | undefined> => {
  let detected = await fileTypeParser.fromBuffer(head);
  const lowerName = filename.toLowerCase();

  if (!detected && lowerName.endsWith('.eml')) {
    detected = { mime: 'text/plain', ext: 'eml' };
  }

  if (lowerName.endsWith('.msg')) {
    if (detected?.mime === 'application/x-cfb') {
      detected = { mime: 'application/x-cfb', ext: 'msg' };
    } else if (!detected) {
      detected = { mime: 'application/vnd.ms-outlook', ext: 'msg' };
    }
  }

  // Office Open XML files (.docx, .xlsx, .pptx) are ZIP-based and file-type
  // may misdetect them as application/zip.
  // See https://github.com/sindresorhus/file-type/issues/785
  if (detected?.mime === 'application/zip') {
    const ext = filename.split('.').pop()?.toLowerCase();
    const zipBasedMimeTypes: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      odt: 'application/vnd.oasis.opendocument.text',
      ods: 'application/vnd.oasis.opendocument.spreadsheet',
      odp: 'application/vnd.oasis.opendocument.presentation',
    };
    if (ext && ext in zipBasedMimeTypes) {
      detected = { mime: zipBasedMimeTypes[ext], ext };
    }
  }

  if (!detected?.mime && browserType && ALLOWED_MIME_TYPES.includes(browserType)) {
    const ext = filename.includes('.') ? (filename.split('.').pop()?.toLowerCase() ?? 'bin') : 'bin';
    detected = { mime: browserType, ext };
  }

  return detected;
};

/**
 * Streams the uploaded file end-to-end without buffering it:
 *  - Parses multipart with busboy directly off c.env.incoming.
 *  - Sniffs the MIME type on the first 4 KB only.
 *  - Enforces MAX_FILE_SIZE via a counting Transform that aborts the pipeline.
 *  - Exposes the validated Readable + final byte count via c.set('uploadedFile').
 */
const extractUploadedFileMiddleware = factoryWithUploadedFile.createMiddleware(async (c, next) => {
  const env = c.env as { incoming?: IncomingMessage } | undefined;
  const incoming = env?.incoming;
  if (!incoming) {
    throwHTTPException400BadRequest('Missing request body', { res: c.res });
    return;
  }

  let filePart: ParsedFilePart;
  try {
    filePart = await parseFirstFile(incoming);
  } catch (err) {
    if (err instanceof Error && /boundary|multipart/i.test(err.message)) {
      throwHTTPException400BadRequest('Invalid multipart body', { res: c.res });
      return;
    }
    throwHTTPException400BadRequest('Invalid file', { res: c.res });
    return;
  }

  const { fileStream, filename, mimeType } = filePart;
  const { head, remainderIterator } = await sampleHead(fileStream, SNIFF_SIZE);

  const detectedType = await resolveMimeType(head, filename, mimeType);

  if (!detectedType?.mime || !ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
    fileStream.resume();
    fileStream.destroy();
    throwHTTPException400BadRequest(`File type "${detectedType?.mime ?? 'unknown'}" is not allowed`, {
      cause: { name: API_ERROR_CODES.FILE_TYPE },
      res: c.res,
      kind: ERROR_KIND.BUSINESS,
    });
    return;
  }

  const sanitizedFilename = sanitizeFilename(filename, detectedType.ext);
  const sizeLimiter = createSizeLimiter(MAX_FILE_SIZE);

  // Feed the limiter from the reassembled (head + remainder) stream.
  (async () => {
    try {
      for await (const chunk of remainderIterator) {
        if (!sizeLimiter.write(chunk)) {
          await new Promise<void>((resolve) => sizeLimiter.once('drain', () => resolve()));
        }
      }
      if (fileStream.truncated) {
        sizeLimiter.destroy(new FileSizeExceededError());
        return;
      }
      sizeLimiter.end();
    } catch (err) {
      sizeLimiter.destroy(err as Error);
    }
  })();

  const uploadedFile: UploadedFileContext = {
    stream: sizeLimiter,
    fileName: sanitizedFilename,
    contentType: detectedType.mime,
    getReadBytes: () => sizeLimiter.getBytesRead(),
  };

  c.set('uploadedFile', uploadedFile);

  try {
    await next();
  } catch (err) {
    if (err instanceof FileSizeExceededError) {
      throwHTTPException400BadRequest('File size exceeds the maximum allowed', {
        cause: { name: API_ERROR_CODES.FILE_MAX_SIZE },
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }
    throw err;
  }
});

export default extractUploadedFileMiddleware;
