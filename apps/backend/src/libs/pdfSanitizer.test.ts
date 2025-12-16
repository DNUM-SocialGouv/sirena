import { PDFDocument } from 'pdf-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isPdfMimeType, sanitizePdf } from './pdfSanitizer';

vi.mock('./asyncLocalStorage', () => ({
  getLoggerStore: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('pdfSanitizer', () => {
  describe('isPdfMimeType', () => {
    it('should return true for application/pdf', () => {
      expect(isPdfMimeType('application/pdf')).toBe(true);
    });

    it('should return false for other MIME types', () => {
      expect(isPdfMimeType('image/png')).toBe(false);
      expect(isPdfMimeType('application/json')).toBe(false);
      expect(isPdfMimeType('text/plain')).toBe(false);
      expect(isPdfMimeType('')).toBe(false);
    });
  });

  describe('sanitizePdf', () => {
    let simplePdfBuffer: Buffer;

    beforeEach(async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([600, 400]);
      const pdfBytes = await pdfDoc.save();
      simplePdfBuffer = Buffer.from(pdfBytes);
    });

    it('should sanitize a simple PDF without errors', async () => {
      const result = await sanitizePdf(simplePdfBuffer);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should produce a valid PDF after sanitization', async () => {
      const result = await sanitizePdf(simplePdfBuffer);

      const reloadedDoc = await PDFDocument.load(result);
      expect(reloadedDoc.getPageCount()).toBe(1);
    });

    it('should throw error for invalid PDF data', async () => {
      const invalidBuffer = Buffer.from('not a pdf');

      await expect(sanitizePdf(invalidBuffer)).rejects.toThrow('Failed to sanitize PDF');
    });

    it('should throw error for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(sanitizePdf(emptyBuffer)).rejects.toThrow('Failed to sanitize PDF');
    });

    it('should handle PDF with multiple pages', async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([600, 400]);
      pdfDoc.addPage([600, 400]);
      pdfDoc.addPage([600, 400]);
      const pdfBytes = await pdfDoc.save();
      const multiPageBuffer = Buffer.from(pdfBytes);

      const result = await sanitizePdf(multiPageBuffer);

      const reloadedDoc = await PDFDocument.load(result);
      expect(reloadedDoc.getPageCount()).toBe(3);
    });
  });
});
