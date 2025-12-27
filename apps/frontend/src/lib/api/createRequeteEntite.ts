import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';
import type { DeclarantData } from '@/lib/declarant';

interface CreateRequeteInput {
  declarant?: DeclarantData;
  receptionDate?: string | null;
  receptionTypeId?: string | null;
}

export async function createRequeteEntite(data: CreateRequeteInput) {
  const res = await client['requetes-entite'].$post({
    json: data,
  });
  await handleRequestErrors(res);
  const result = await res.json();
  return result.data;
}
