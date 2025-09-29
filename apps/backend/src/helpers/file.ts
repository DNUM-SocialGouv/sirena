import { Readable } from 'node:stream';
import { fileTypeFromStream } from 'file-type';
import { MAX_FILE_SIZE } from '@/config/files.constant';

export const sanitizeFilename = (originalName: string, detectedExtension: string): string => {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');

  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9\s\-_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();

  return `${sanitizedName}.${detectedExtension}`;
};

export const urlToStream = async (url: string) => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
  }

  const sizeHdr = res.headers.get('content-length');
  const size = sizeHdr ? Number(sizeHdr) : undefined;
  if (size && size > MAX_FILE_SIZE) throw new Error('File too large');

  const sniff = await fileTypeFromStream(res.body);

  const mimeSniffed = sniff?.mime;

  const mimeFromHeader = res.headers.get('content-type');

  const node = Readable.fromWeb(res.body);

  return {
    stream: node,
    size: size ?? undefined,
    mimeFromHeader,
    mimeSniffed,
    extSniffed: sniff?.ext,
  };
};
