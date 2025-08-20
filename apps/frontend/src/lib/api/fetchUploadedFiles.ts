import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function uploadFile(file: File) {
  const res = await client['uploaded-files'].$post({
    form: { file },
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}
