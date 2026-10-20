import { client } from '@/lib/api/hc';
import { handleRequestErrors } from '@/lib/api/tanstackQuery';

export async function acceptCgu(version: string) {
  const res = await client.profile['cgu-acceptance'].$post({ json: { version } });
  // The CGU modal shows its own error message
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}
