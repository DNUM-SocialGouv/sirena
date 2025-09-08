import { client } from '@/lib/api/hc';
import { handleRequestErrors, type RequestErrorOptions } from '@/lib/api/tanstackQuery';

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
