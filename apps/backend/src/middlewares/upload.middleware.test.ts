import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppBindings } from '../helpers/factories/appWithUploadedFile.js';
import { createMockPinoLogger } from '../tests/test-utils.js';
import extractUploadedFileMiddleware from './upload.middleware';

const FIXED_DATE = new Date('2025-08-06T10:00:00.000Z');

interface UploadMockContextOverrides {
  req?: Partial<{ parseBody: ReturnType<typeof vi.fn> }>;
  res?: Record<string, unknown>;
  logger?: ReturnType<typeof createMockPinoLogger>;
  get?: (key: string) => unknown;
  json?: ReturnType<typeof vi.fn>;
}

const createUploadMockContext = (overrides: UploadMockContextOverrides = {}) => {
  const defaultLogger = createMockPinoLogger();

  return {
    req: {
      parseBody: vi.fn().mockResolvedValue({}),
      ...overrides.req,
    },
    res: {},
    set: vi.fn(),
    get: vi.fn().mockImplementation((key: string) => {
      if (key === 'logger') {
        return overrides.logger || defaultLogger;
      }
      return overrides.get?.(key);
    }),
    json: vi.fn(),
    ...overrides,
  };
};

const { mockFileTypeFromBuffer, mockThrowHTTPException400BadRequest } = vi.hoisted(() => {
  const mockFileTypeFromBuffer = vi.fn();
  const mockThrowHTTPException400BadRequest = vi.fn();

  return { mockFileTypeFromBuffer, mockThrowHTTPException400BadRequest };
});

vi.mock('@sirena/backend-utils/helpers', () => ({
  throwHTTPException400BadRequest: mockThrowHTTPException400BadRequest,
}));

vi.mock('../libs/minio.js', () => ({
  getFileStream: vi.fn(),
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: mockFileTypeFromBuffer,
}));

describe('upload.middleware.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
    vi.clearAllMocks();

    mockFileTypeFromBuffer.mockResolvedValue({
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
      mockFileTypeFromBuffer.mockResolvedValue({
        mime: 'image/png',
        ext: 'png',
      });

      const mockContext = createUploadMockContext({
        req: {
          parseBody: vi.fn().mockResolvedValue({
            file: new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'test-image.png', {
              type: 'image/png',
            }),
          }),
        },
        get: vi.fn().mockReturnValue({
          logger: createMockPinoLogger(),
        }),
      });
      const next = vi.fn();

      await extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next);

      expect(mockContext.set).toHaveBeenCalledWith('uploadedFile', {
        buffer: expect.any(Buffer),
        fileName: 'test-image.png',
        contentType: 'image/png',
        size: 4,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should throw an error if the file is not a valid file instance', async () => {
      mockThrowHTTPException400BadRequest.mockImplementation(() => {
        throw new HTTPException(400, { message: 'Invalid file' });
      });

      const mockContext = createUploadMockContext({
        req: {
          parseBody: vi.fn().mockResolvedValue({
            file: {},
          }),
        },
        get: vi.fn().mockReturnValue({
          logger: createMockPinoLogger(),
        }),
      });
      const next = vi.fn();

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'Invalid file',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('Invalid file', { res: mockContext.res });
      expect(mockContext.set).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw an error if the file is too large', async () => {
      mockThrowHTTPException400BadRequest.mockImplementation(() => {
        throw new HTTPException(400, { message: 'File size exceeds the maximum allowed' });
      });

      const mockContext = createUploadMockContext({
        req: {
          parseBody: vi.fn().mockResolvedValue({
            file: new File([new Uint8Array(1024 * 1024 * 1024)], 'test-document.pdf', {
              type: 'application/pdf',
            }),
          }),
        },
        get: vi.fn().mockReturnValue({
          logger: createMockPinoLogger(),
        }),
      });
      const next = vi.fn();

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'File size exceeds the maximum allowed',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('File size exceeds the maximum allowed', {
        res: mockContext.res,
        cause: { name: 'FILE_MAX_SIZE' },
      });
      expect(mockContext.set).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw an error when detected mime is not defined', async () => {
      mockFileTypeFromBuffer.mockResolvedValue(undefined);
      mockThrowHTTPException400BadRequest.mockImplementation(() => {
        throw new HTTPException(400, { message: 'File type "undefined" is not allowed' });
      });

      const mockContext = createUploadMockContext({
        req: {
          parseBody: vi.fn().mockResolvedValue({
            file: new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x25, 0x50, 0x44, 0x46])], 'test-document.pdf', {
              type: 'application/pdf',
            }),
          }),
        },
        get: vi.fn().mockReturnValue({
          logger: createMockPinoLogger(),
        }),
      });
      const next = vi.fn();

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'File type "undefined" is not allowed',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('File type "undefined" is not allowed', {
        res: mockContext.res,
        cause: { name: 'FILE_TYPE' },
      });
      expect(mockContext.set).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw an error when detected mime is not allowed', async () => {
      mockFileTypeFromBuffer.mockResolvedValue({
        mime: 'application/toto',
        ext: 'toto',
      });
      mockThrowHTTPException400BadRequest.mockImplementation(() => {
        throw new HTTPException(400, { message: 'File type "application/toto" is not allowed' });
      });

      const mockContext = createUploadMockContext({
        req: {
          parseBody: vi.fn().mockResolvedValue({
            file: new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x25, 0x50, 0x44, 0x46])], 'test-document.pdf', {
              type: 'application/pdf',
            }),
          }),
        },
        get: vi.fn().mockReturnValue({
          logger: createMockPinoLogger(),
        }),
      });
      const next = vi.fn();

      await expect(extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next)).rejects.toThrow(
        'File type "application/toto" is not allowed',
      );
      expect(mockThrowHTTPException400BadRequest).toHaveBeenCalledWith('File type "application/toto" is not allowed', {
        cause: { name: 'FILE_TYPE' },
        res: mockContext.res,
      });
      expect(mockContext.set).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
