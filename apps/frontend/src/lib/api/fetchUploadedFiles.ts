import { client } from '@/lib/api/hc';
import { handleRequestErrors, type RequestErrorOptions } from '@/lib/api/tanstackQuery';

export interface FileProcessingStatus {
  id: string;
  status: string;
  scanStatus: string;
  sanitizeStatus: string;
  processingError: string | null;
  safeFilePath: string | null;
}

export async function uploadFile(file: File, options: RequestErrorOptions = {}) {
  const res = await client['uploaded-files'].$post({
    form: { file },
  });
  await handleRequestErrors(res, options);
  const { data } = await res.json();
  return data;
}

export async function deleteUploadedFile(id: string) {
  const res = await client['uploaded-files'][':id'].$delete({
    param: { id },
  });
  await handleRequestErrors(res);
  return;
}

export async function getFileProcessingStatus(id: string): Promise<FileProcessingStatus> {
  const res = await client['uploaded-files'][':id'].status.$get({
    param: { id },
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
