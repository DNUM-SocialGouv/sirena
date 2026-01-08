import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE, validateFile, validateFiles } from '../fileValidation';

const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('fileValidation', () => {
  describe('validateFile', () => {
    it('should validate a valid PDF file', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const errors = validateFile(file);
      expect(errors).toHaveLength(0);
    });

    it('should validate a valid JPEG file', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const errors = validateFile(file);
      expect(errors).toHaveLength(0);
    });

    it('should validate a valid EML file', () => {
      const file = new File(['content'], 'test.eml', { type: 'text/plain' });
      const errors = validateFile(file);
      expect(errors).toHaveLength(0);
    });

    it('should validate a valid MSG file', () => {
      const file = new File(['content'], 'test.msg', { type: 'application/x-cfb' });
      const errors = validateFile(file);
      expect(errors).toHaveLength(0);
    });

    it('should reject file that is too large', () => {
      const file = createMockFile('large.pdf', 'application/pdf', MAX_FILE_SIZE + 1);
      const errors = validateFile(file);

      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('size');
      expect(errors[0].message).toContain('dépasse la taille maximale');
    });

    it('should reject unsupported file type', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-executable' });
      const errors = validateFile(file);

      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('format');
      expect(errors[0].message).toContain("n'est pas supporté");
    });

    it('should reject file with unsupported extension', () => {
      const file = new File(['content'], 'test.xyz', { type: 'application/octet-stream' });
      const errors = validateFile(file);

      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('format');
    });

    it('should validate file by extension when MIME type is not recognized', () => {
      const file = new File(['content'], 'test.docx', { type: 'application/octet-stream' });
      const errors = validateFile(file);
      expect(errors).toHaveLength(0);
    });

    it('should reject file with both size and format errors', () => {
      const file = createMockFile('large.exe', 'application/x-executable', MAX_FILE_SIZE + 1);
      const errors = validateFile(file);

      expect(errors).toHaveLength(2);
      expect(errors.some((e) => e.type === 'size')).toBe(true);
      expect(errors.some((e) => e.type === 'format')).toBe(true);
    });
  });

  describe('validateFiles', () => {
    it('should return empty object for valid files', () => {
      const files = [
        new File(['content'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      const errors = validateFiles(files);
      expect(errors).toEqual({});
    });

    it('should return errors for invalid files', () => {
      const files = [
        new File(['content'], 'valid.pdf', { type: 'application/pdf' }),
        createMockFile('large.pdf', 'application/pdf', MAX_FILE_SIZE + 1),
        new File(['content'], 'invalid.exe', { type: 'application/x-executable' }),
      ];
      const errors = validateFiles(files);

      expect(errors).toHaveProperty('large.pdf');
      expect(errors).toHaveProperty('invalid.exe');
      expect(errors).not.toHaveProperty('valid.pdf');
    });
  });
});
