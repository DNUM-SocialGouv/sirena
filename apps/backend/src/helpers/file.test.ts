import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sanitizeFilename, urlToStream } from './file';

vi.mock('@/config/files.constant', () => ({ MAX_FILE_SIZE: 5 }));

const fileTypeFromStreamMock = vi.fn();

vi.mock('file-type', () => ({
  fileTypeFromStream: () => fileTypeFromStreamMock(),
}));

function webStreamFromString(s: string) {
  const enc = new TextEncoder().encode(s);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(enc);
      controller.close();
    },
  });
}

function collect(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

describe('file.ts', () => {
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

  describe('urlToStream', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      fileTypeFromStreamMock.mockReset();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('returns stream + metadata on success', async () => {
      const body = webStreamFromString('data'); // 4 bytes
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(body, {
          status: 200,
          headers: { 'content-length': '4', 'content-type': 'text/plain' },
        }),
      );

      fileTypeFromStreamMock.mockResolvedValue({ mime: 'text/plain', ext: 'txt' });

      const out = await urlToStream('https://example.com/x');

      expect(out.size).toBe(4);
      expect(out.mimeFromHeader).toBe('text/plain');
      expect(out.mimeSniffed).toBe('text/plain');
      expect(out.extSniffed).toBe('txt');
      expect(out.stream).toBeInstanceOf(Readable);

      const buf = await collect(out.stream);
      expect(buf.toString()).toBe('data');

      expect(fileTypeFromStreamMock).toHaveBeenCalledTimes(1);
    });

    it('throws on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
      await expect(urlToStream('https://e/x')).rejects.toThrow('Failed to fetch https://e/x (HTTP 404)');
    });

    it('throws when body is missing', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 200, headers: { 'content-length': '0' } }));
      await expect(urlToStream('https://e/x')).rejects.toThrow(/Failed to fetch/i);
    });

    it('throws when content-length exceeds MAX_FILE_SIZE', async () => {
      const body = webStreamFromString('0123456789');
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(body, {
          status: 200,
          headers: { 'content-length': '10', 'content-type': 'application/octet-stream' },
        }),
      );
      await expect(urlToStream('https://e/x')).rejects.toThrow(/File too large/i);
    });

    it('handles missing content-length (size undefined)', async () => {
      const body = webStreamFromString('ok');
      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(new Response(body, { status: 200, headers: { 'content-type': 'text/plain' } }));
      fileTypeFromStreamMock.mockResolvedValue({ mime: 'text/plain', ext: 'txt' });

      const out = await urlToStream('https://e/x');

      expect(out.size).toBeUndefined();
      expect(out.mimeFromHeader).toBe('text/plain');
      expect(out.mimeSniffed).toBe('text/plain');
      expect(out.extSniffed).toBe('txt');
      const buf = await collect(out.stream);
      expect(buf.toString()).toBe('ok');
    });
  });
});
