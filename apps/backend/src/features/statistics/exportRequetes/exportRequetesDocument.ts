import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { createTextStream } from '../../../helpers/stream.js';
import { type ExportRequetesParams, prepareExportRequetesCsv } from './exportRequetes.service.js';

export const EXPORT_REQUETES_MIME_TYPE = 'text/csv';

export type GeneratedDocument = {
  fileName: string;
  mimeType: string;
  stream: Readable;
  // Read once the stream has been fully consumed.
  getStats: () => { rowCount: number; size: number };
};

export const getExportRequetesFileName = ({
  startDate,
  endDate,
}: Pick<ExportRequetesParams, 'startDate' | 'endDate'>) => `export-requetes-sirena_${startDate}_${endDate}.csv`;

/** The requêtes CSV as a Node stream, so it can be encrypted and uploaded without being held in memory. */
export async function generateExportRequetesDocument(params: ExportRequetesParams): Promise<GeneratedDocument> {
  const writeCsv = await prepareExportRequetesCsv(params);
  let rowCount = 0;
  let size = 0;

  const webStream = createTextStream(async (write) => {
    rowCount = await writeCsv(async (chunk) => {
      size += Buffer.byteLength(chunk, 'utf8');
      await write(chunk);
    });
  });

  return {
    fileName: getExportRequetesFileName(params),
    mimeType: EXPORT_REQUETES_MIME_TYPE,
    stream: Readable.fromWeb(webStream as NodeReadableStream<Uint8Array>),
    getStats: () => ({ rowCount, size }),
  };
}
