export const MAX_FILE_SIZE = 200 * 1024 * 1024; // Demat social may have 200Mo files

/**
 * Maximum PDF size accepted for sanitization.
 *
 * pdf-lib only works on a complete Buffer: sanitizing a PDF holds the source file, the parsed
 * object tree and the re-serialized document in memory at once, so the peak is roughly
 * PDF_SANITIZATION_FACTOR times the file size.
 *
 * Worker pod sizing (1500Mi limit, see helm_charts/charts/worker/values.yaml):
 *   MAX_PDF_SANITIZATION_SIZE * FILE_PROCESSING_CONCURRENCY * PDF_SANITIZATION_FACTOR
 *   = 25Mi * 5 * 5 = 625Mi, on top of a ~250Mi Node/Prisma/BullMQ baseline, so ~875Mi worst
 *   case, about 40% below the limit.
 *
 * Above this threshold the file is still scanned by ClamAV, which streams and never buffers, but
 * sanitization is reported as SKIPPED: no safeFilePath is produced, so the safe-file endpoint
 * answers 404 and exports prefix the file name with [ATTENTION].
 */
export const MAX_PDF_SANITIZATION_SIZE = 25 * 1024 * 1024;

/**
 * Memory a sanitization job holds, relative to the source PDF size: the buffer itself plus the
 * parse and re-serialize overhead, measured around 3x on a 25Mi PDF. Kept at 5 as a margin.
 */
export const PDF_SANITIZATION_FACTOR = 5;

/** Number of file processing jobs a worker pod runs in parallel. */
export const FILE_PROCESSING_CONCURRENCY = 5;

export const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',

  // EML
  'message/rfc822',

  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // OpenOffice / LibreOffice
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',

  // Outlook MSG
  'application/vnd.ms-outlook',
  'application/x-cfb',

  // CSV / TXT
  'text/csv',
  'text/plain',

  // Images
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/tiff',
];
