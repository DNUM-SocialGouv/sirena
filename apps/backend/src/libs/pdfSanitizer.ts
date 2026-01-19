import { PDFArray, PDFDict, PDFDocument, PDFName, type PDFObject } from 'pdf-lib';
import { getLoggerStore } from './asyncLocalStorage.js';

/**
 * Recursively removes JavaScript actions from a PDF object and its children.
 */
const removeJavaScriptFromObject = (pdfObject: PDFObject | undefined): void => {
  if (!pdfObject || !(pdfObject instanceof PDFDict)) return;

  const jsKey = PDFName.of('JS');
  const javascriptKey = PDFName.of('JavaScript');
  const sKey = PDFName.of('S');

  if (pdfObject.has(jsKey)) {
    pdfObject.delete(jsKey);
  }

  if (pdfObject.has(javascriptKey)) {
    pdfObject.delete(javascriptKey);
  }

  const actionType = pdfObject.get(sKey);
  if (actionType instanceof PDFName && actionType.decodeText() === 'JavaScript') {
    pdfObject.delete(sKey);
  }

  for (const value of pdfObject.values()) {
    if (value instanceof PDFDict) {
      removeJavaScriptFromObject(value);
    } else if (value instanceof PDFArray) {
      for (const item of value.asArray()) {
        if (item instanceof PDFDict) {
          removeJavaScriptFromObject(item);
        }
      }
    }
  }
};

/**
 * Removes embedded files from the PDF document.
 */
const removeEmbeddedFiles = (catalog: PDFDict): void => {
  const namesDict = catalog.get(PDFName.of('Names'));
  if (namesDict instanceof PDFDict) {
    if (namesDict.has(PDFName.of('EmbeddedFiles'))) {
      namesDict.delete(PDFName.of('EmbeddedFiles'));
    }
  }
};

/**
 * Removes potentially dangerous actions from annotations.
 */
const sanitizeAnnotations = (page: PDFDict): void => {
  const annotsArray = page.get(PDFName.of('Annots'));
  if (!(annotsArray instanceof PDFArray)) return;

  for (const annotRef of annotsArray.asArray()) {
    const annot = annotRef instanceof PDFDict ? annotRef : (annotRef as { lookup?: () => PDFObject }).lookup?.();
    if (annot instanceof PDFDict) {
      removeJavaScriptFromObject(annot);

      if (annot.has(PDFName.of('A'))) {
        const action = annot.get(PDFName.of('A'));
        if (action instanceof PDFDict) {
          removeJavaScriptFromObject(action);
        }
      }
    }
  }
};

/**
 * Sanitizes a PDF by removing JavaScript, embedded files, and other potentially dangerous content.
 * Uses pdf-lib for pure JavaScript processing without external dependencies.
 *
 * @param pdfBuffer - The PDF file as a Buffer
 * @returns Sanitized PDF as a Buffer
 * @throws Error if PDF processing fails
 */
export const sanitizePdf = async (pdfBuffer: Buffer): Promise<Buffer> => {
  const logger = getLoggerStore();
  const originalSize = pdfBuffer.length;

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
    });

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const pageDict = page.node;

      removeJavaScriptFromObject(pageDict);

      const aaDict = pageDict.get(PDFName.of('AA'));
      if (aaDict instanceof PDFDict) {
        removeJavaScriptFromObject(aaDict);
        pageDict.delete(PDFName.of('AA'));
      }

      sanitizeAnnotations(pageDict);
    }

    const catalog = pdfDoc.catalog;

    const openAction = catalog.get(PDFName.of('OpenAction'));
    if (openAction instanceof PDFDict) {
      removeJavaScriptFromObject(openAction);
      catalog.delete(PDFName.of('OpenAction'));
    }

    const namesDict = catalog.get(PDFName.of('Names'));
    if (namesDict instanceof PDFDict) {
      const jsDict = namesDict.get(PDFName.of('JavaScript'));
      if (jsDict) {
        namesDict.delete(PDFName.of('JavaScript'));
      }
    }

    removeEmbeddedFiles(catalog);

    if (catalog.has(PDFName.of('AA'))) {
      catalog.delete(PDFName.of('AA'));
    }

    const sanitizedBytes = await pdfDoc.save();
    const sanitizedBuffer = Buffer.from(sanitizedBytes);

    logger.info(
      {
        originalSize,
        sanitizedSize: sanitizedBuffer.length,
        pageCount: pages.length,
      },
      'PDF sanitized successfully',
    );

    return sanitizedBuffer;
  } catch (error) {
    logger.error({ error, originalSize }, 'Failed to sanitize PDF');
    throw new Error(`Failed to sanitize PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Checks if a file is a PDF based on its MIME type
 */
export const isPdfMimeType = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};
