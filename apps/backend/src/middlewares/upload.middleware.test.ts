import { Readable } from 'node:stream';
import { ERROR_KIND } from '@sirena/common/constants';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_FILE_SIZE } from '../config/files.constant.js';
import type { AppBindings, UploadedFileContext } from '../helpers/factories/appWithUploadedFile.js';
import { createMockPinoLogger } from '../tests/test-utils.js';
import extractUploadedFileMiddleware from './upload.middleware.js';

const FIXED_DATE = new Date('2025-08-06T10:00:00.000Z');

interface BuildMultipartArgs {
  content: Buffer;
  filename: string;
  mimeType: string;
}

const buildMultipartBody = ({ content, filename, mimeType }: BuildMultipartArgs) => {
  const boundary = `----BoundaryTest${Math.random().toString(36).slice(2)}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`),
    Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return {
    body,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'content-length': String(body.length),
    },
  };
};

const buildMockIncoming = (args: BuildMultipartArgs) => {
  const { body, headers } = buildMultipartBody(args);
  const stream = Readable.from([body]) as Readable & { headers: Record<string, string> };
  stream.headers = headers;
  return stream;
};

interface UploadMockContextOverrides {
  incoming?: Readable & { headers: Record<string, string> };
  res?: Record<string, unknown>;
  logger?: ReturnType<typeof createMockPinoLogger>;
  get?: (key: string) => unknown;
}

const createUploadMockContext = (overrides: UploadMockContextOverrides = {}) => {
  const defaultLogger = createMockPinoLogger();
  const incoming = overrides.incoming;

  return {
    req: {},
    env: incoming ? { incoming } : undefined,
    res: overrides.res ?? {},
    set: vi.fn(),
    get: vi.fn().mockImplementation((key: string) => {
      if (key === 'logger') {
        return overrides.logger || defaultLogger;
      }
      return overrides.get?.(key);
    }),
    json: vi.fn(),
  };
};

const drainUploadedFileStream = async (mockContext: ReturnType<typeof createUploadMockContext>) => {
  const setCall = vi.mocked(mockContext.set).mock.calls.find(([key]) => key === 'uploadedFile');
  if (!setCall) return null;
  const payload = setCall[1] as UploadedFileContext | undefined;
  if (!payload) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of payload.stream) chunks.push(chunk as Buffer);
  return { payload, content: Buffer.concat(chunks) };
};

const { mockFromBuffer, mockThrowHTTPException400BadRequest } = vi.hoisted(() => ({
  mockFromBuffer: vi.fn(),
  mockThrowHTTPException400BadRequest: vi.fn(),
}));

vi.mock('@sirena/backend-utils/helpers', () => ({
  throwHTTPException400BadRequest: mockThrowHTTPException400BadRequest,
}));

vi.mock('../libs/minio.js', () => ({
  getFileStream: vi.fn(),
}));

vi.mock('../helpers/file.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../helpers/file.js')>();
  return {
    ...actual,
    fileTypeParser: { fromBuffer: mockFromBuffer },
  };
});

describe('upload.middleware.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
    vi.clearAllMocks();

    mockFromBuffer.mockResolvedValue({
      mime: 'application/pdf',
      ext: 'pdf',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('extractUploadedFileMiddleware', () => {
    it('extractUploadedFileMiddleware should be defined', () => {
      expect(extractUploadedFileMiddleware).toBeDefined();
    });

    it('should successfully extract and process a valid file', async () => {
      mockFromBuffer.mockResolvedValue({ mime: 'image/png', ext: 'png' });

      const content = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const mockContext = createUploadMockContext({
        incoming: buildMockIncoming({ content, filename: 'test-image.png', mimeType: 'image/png' }),
      });
      const next = vi.fn();

      await extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next);

      expect(mockContext.set).toHaveBeenCalledWith(
        'uploadedFile',
        expect.objectContaining({
          stream: expect.anything(),
          fileName: 'test-image.png',
          contentType: 'image/png',
          getReadBytes: expect.any(Function),
        }),
      );
      expect(next).toHaveBeenCalled();

      const drained = await drainUploadedFileStream(mockContext);
      expect(drained?.content.equals(content)).toBe(true);
      expect(drained?.payload.getReadBytes()).toBe(content.length);
    });

    it('should throw an error if no request body is available', async () => {
      mockThrowHTTPException400BadRequest.mockImplementation(() => {
        throw new HTTPException(400, { message: 'Missing request body' });
      });

      const mockContext = createUploadMockContext({});
      const next = vi.fn();

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'Missing request body',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('Missing request body', {
        res: mockContext.res,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw an error when detected mime is not defined and browser type is missing or not allowed', async () => {
      mockFromBuffer.mockResolvedValue(undefined);
      mockThrowHTTPException400BadRequest.mockImplementation((msg: string) => {
        throw new HTTPException(400, { message: msg });
      });

      const mockContext = createUploadMockContext({
        incoming: buildMockIncoming({
          content: Buffer.alloc(100),
          filename: 'document.bin',
          mimeType: 'application/octet-stream',
        }),
      });
      const next = vi.fn();

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'File type "unknown" is not allowed',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('File type "unknown" is not allowed', {
        res: mockContext.res,
        cause: { name: 'FILE_TYPE' },
        kind: ERROR_KIND.BUSINESS,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept file when file-type returns undefined but multipart mime is allowed (browser fallback)', async () => {
      mockFromBuffer.mockResolvedValue(undefined);

      const mockContext = createUploadMockContext({
        incoming: buildMockIncoming({
          content: Buffer.alloc(100),
          filename: 'document.pdf',
          mimeType: 'application/pdf',
        }),
      });
      const next = vi.fn();

      await extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next);

      expect(mockContext.set).toHaveBeenCalledWith(
        'uploadedFile',
        expect.objectContaining({
          contentType: 'application/pdf',
          fileName: expect.any(String),
          getReadBytes: expect.any(Function),
        }),
      );
      expect(next).toHaveBeenCalled();
    });

    it('should remap application/zip to correct Office MIME type for .pptx files', async () => {
      mockFromBuffer.mockResolvedValue({ mime: 'application/zip', ext: 'zip' });

      const mockContext = createUploadMockContext({
        incoming: buildMockIncoming({
          content: Buffer.alloc(100),
          filename: 'presentation.pptx',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        }),
      });
      const next = vi.fn();

      await extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next);

      expect(mockContext.set).toHaveBeenCalledWith(
        'uploadedFile',
        expect.objectContaining({
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          fileName: 'presentation.pptx',
        }),
      );
      expect(next).toHaveBeenCalled();
    });

    it('should remap application/zip to correct Office MIME type for .docx files', async () => {
      mockFromBuffer.mockResolvedValue({ mime: 'application/zip', ext: 'zip' });

      const mockContext = createUploadMockContext({
        incoming: buildMockIncoming({
          content: Buffer.alloc(100),
          filename: 'document.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      });
      const next = vi.fn();

      await extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next);

      expect(mockContext.set).toHaveBeenCalledWith(
        'uploadedFile',
        expect.objectContaining({
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileName: 'document.docx',
        }),
      );
      expect(next).toHaveBeenCalled();
    });

    it('should throw an error if the file is too large', async () => {
      mockFromBuffer.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
      mockThrowHTTPException400BadRequest.mockImplementation((msg: string) => {
        throw new HTTPException(400, { message: msg });
      });

      const oversized = Buffer.alloc(MAX_FILE_SIZE + 1024);
      const mockContext = createUploadMockContext({
        incoming: buildMockIncoming({ content: oversized, filename: 'big.pdf', mimeType: 'application/pdf' }),
      });

      const next = vi.fn(async () => {
        await drainUploadedFileStream(mockContext);
      });

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'File size exceeds the maximum allowed',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('File size exceeds the maximum allowed', {
        cause: { name: 'FILE_MAX_SIZE' },
        res: mockContext.res,
        kind: ERROR_KIND.BUSINESS,
      });
    });

    it('should throw an error when detected mime is not allowed', async () => {
      mockFromBuffer.mockResolvedValue({ mime: 'application/toto', ext: 'toto' });
      mockThrowHTTPException400BadRequest.mockImplementation(() => {
        throw new HTTPException(400, { message: 'File type "application/toto" is not allowed' });
      });

      const mockContext = createUploadMockContext({
        incoming: buildMockIncoming({
          content: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x25, 0x50, 0x44, 0x46]),
          filename: 'test-document.pdf',
          mimeType: 'application/pdf',
        }),
      });
      const next = vi.fn();

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'File type "application/toto" is not allowed',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('File type "application/toto" is not allowed', {
        cause: { name: 'FILE_TYPE' },
        res: mockContext.res,
        kind: ERROR_KIND.BUSINESS,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
