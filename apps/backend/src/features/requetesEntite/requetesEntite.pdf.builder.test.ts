import { describe, expect, it } from 'vitest';
import { RequetePdfBuilder } from './requetesEntite.pdf.builder.js';

async function buildPdf(fn: (builder: RequetePdfBuilder) => RequetePdfBuilder): Promise<Buffer> {
  const builder = new RequetePdfBuilder('Test');
  return fn(builder).toBuffer();
}

describe('RequetePdfBuilder', () => {
  describe('toBuffer', () => {
    it('returns a non-empty Buffer', async () => {
      const buffer = await new RequetePdfBuilder('My title').toBuffer();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('starts with the PDF signature %PDF-', async () => {
      const buffer = await new RequetePdfBuilder('My title').toBuffer();
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    });
  });

  describe('XMP metadata', () => {
    it('injects a Metadata/XML stream in the PDF catalog', async () => {
      const buffer = await new RequetePdfBuilder('My title').toBuffer();
      const content = buffer.toString('binary');
      expect(content).toContain('/Type /Metadata');
      expect(content).toContain('/Subtype /XML');
      expect(content).toContain('/Metadata');
    });

    it('exposes the title in the PDF info dictionary', async () => {
      const buffer = await new RequetePdfBuilder('My XMP title').toBuffer();
      const content = buffer.toString('binary');
      expect(content).toContain('My XMP title');
    });
  });

  describe('h1', () => {
    it('returns the builder for chaining', () => {
      const builder = new RequetePdfBuilder('Test');
      expect(builder.h1('Title')).toBe(builder);
    });

    it('produces a valid PDF with a h1', async () => {
      const buffer = await buildPdf((b) => b.h1('Main title'));
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('section', () => {
    it('returns the builder for chaining', () => {
      const builder = new RequetePdfBuilder('Test');
      expect(builder.section('Section 1')).toBe(builder);
    });

    it('produces a valid PDF with multiple sections', async () => {
      const buffer = await buildPdf((b) => b.section('Section A').section('Section B'));
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('subsection', () => {
    it('returns the builder for chaining', () => {
      const builder = new RequetePdfBuilder('Test');
      expect(builder.subsection('Subsection')).toBe(builder);
    });

    it('produces a valid PDF inside a section', async () => {
      const buffer = await buildPdf((b) => b.section('Section').subsection('Subsection'));
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('field', () => {
    it('returns the builder for chaining', () => {
      const builder = new RequetePdfBuilder('Test');
      expect(builder.field('Label', 'value')).toBe(builder);
    });

    it('skips null values', async () => {
      const buffer = await buildPdf((b) => b.field('Label', null));
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('skips undefined values', async () => {
      const buffer = await buildPdf((b) => b.field('Label', undefined));
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('skips blank/whitespace-only values', async () => {
      const buffer = await buildPdf((b) => b.field('Label', '   '));
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('produces a valid PDF with a filled value', async () => {
      const buffer = await buildPdf((b) => b.field('Name', 'Dupont'));
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('list', () => {
    it('returns the builder for chaining', () => {
      const builder = new RequetePdfBuilder('Test');
      expect(builder.list(['item'])).toBe(builder);
    });

    it('skips empty arrays', async () => {
      const buffer = await buildPdf((b) => b.list([]));
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('produces a valid PDF with multiple items', async () => {
      const buffer = await buildPdf((b) => b.list(['item 1', 'item 2', 'item 3']));
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('full chaining', () => {
    it('produces a valid PDF with all elements combined', async () => {
      const buffer = await buildPdf((b) =>
        b
          .h1('Main title')
          .section('Section 1')
          .subsection('Subsection 1.1')
          .field('Name', 'Dupont')
          .field('First name', 'Jean')
          .list(['item A', 'item B'])
          .section('Section 2')
          .field('Empty', null)
          .field('Filled', 'value'),
      );
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    });
  });
});
