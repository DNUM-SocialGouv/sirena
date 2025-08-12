import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppBindings } from '@/helpers/factories/appWithUploadedFile';
import { createMockPinoLogger } from '@/tests/test-utils';
import extractUploadedFileMiddleware, { sanitizeFilename } from './upload.middleware';

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

const { mockFileTypeFromBuffer, mockThrowHTTPException400BadRequest, mockWriteFile } = vi.hoisted(() => {
  const mockFileTypeFromBuffer = vi.fn();
  const mockThrowHTTPException400BadRequest = vi.fn();
  const mockWriteFile = vi.fn();

  return { mockFileTypeFromBuffer, mockThrowHTTPException400BadRequest, mockWriteFile };
});

vi.mock('tmp-promise', () => ({
  file: vi.fn().mockResolvedValue({
    path: '/tmp/test-document.pdf',
  }),
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      writeFile: mockWriteFile,
    },
  },
}));

vi.mock('@sirena/backend-utils/helpers', () => ({
  throwHTTPException400BadRequest: mockThrowHTTPException400BadRequest,
}));

vi.mock('node:os', () => ({
  default: {
    tmpdir: vi.fn().mockReturnValue('/tmp'),
  },
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid'),
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: mockFileTypeFromBuffer,
}));

describe('upload.middleware.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
    vi.clearAllMocks();

    mockWriteFile.mockResolvedValue(undefined);
    mockFileTypeFromBuffer.mockResolvedValue({
      mime: 'application/pdf',
      ext: 'pdf',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sanitizeFilename', () => {
    it.each([
      ['simple.txt', 'txt', 'simple.txt'],
      ['document.pdf', 'pdf', 'document.pdf'],
      ['file@name.txt', 'txt', 'filename.txt'],
      ['file#name.pdf', 'pdf', 'filename.pdf'],
      ['my document.txt', 'txt', 'my_document.txt'],
      ['file__name.pdf', 'pdf', 'file_name.pdf'],
      ['file-name.docx', 'docx', 'file-name.docx'],
      ['   c omp    lex@file#name%232   $with%symbols.docx   ', 'docx', '_c_omp_lexfilename232_withsymbols.docx'],
    ])('should handle simple cases with filename: %s with extension %s -> %s', (input, extension, expected) => {
      expect(sanitizeFilename(input, extension)).toBe(expected);
    });

    it.each([
      ['', 'txt', '.txt'],
      ['@#$%^&*()', 'txt', '.txt'],
      ['   ', 'pdf', '_.pdf'],
      ['___', 'txt', '_.txt'],
      ['---', 'pdf', '---.pdf'],
      ['My Document (1).pdf', 'pdf', 'My_Document_1.pdf'],
      ['Screenshot 2024-01-15 at 14.30.25.png', 'png', 'Screenshot_2024-01-15_at_143025.png'],
      ['FW_Important_Document_2024.pdf', 'pdf', 'FW_Important_Document_2024.pdf'],
    ])('should handle edge cases: %s with extension %s -> %s', (input, extension, expected) => {
      expect(sanitizeFilename(input, extension)).toBe(expected);
    });

    it.each([
      ['document.txt', 'pdf', 'document.pdf'],
      ['image.jpg', 'png', 'image.png'],
      ['file.docx', 'xlsx', 'file.xlsx'],
      ['archive.tar.gz', 'zip', 'archivetar.zip'],
    ])('should use detected extension: %s with detected %s -> %s', (input, detectedExt, expected) => {
      expect(sanitizeFilename(input, detectedExt)).toBe(expected);
    });
  });

  describe('extractUploadedFileMiddleware', () => {
    it('extractUploadedFileMiddleware should be defined', () => {
      expect(extractUploadedFileMiddleware).toBeDefined();
    });

    it('should successfully extract and process a valid PDF file', async () => {
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

      await extractUploadedFileMiddleware(mockContext as unknown as Context<AppBindings>, next);

      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockContext.set).toHaveBeenCalledWith('uploadedFile', {
        tempFilePath: `/tmp/test-document.pdf`,
        fileName: 'test-document.pdf',
        contentType: 'application/pdf',
        size: 8,
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
        res: mockContext.res,
      });
      expect(mockContext.set).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
