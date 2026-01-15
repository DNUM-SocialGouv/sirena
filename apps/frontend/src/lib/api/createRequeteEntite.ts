import type { ReceptionType } from '@sirena/common/constants';
import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';
import type { DeclarantData } from '@/lib/declarant';

export interface CreateRequeteInput {
  declarant?: DeclarantData;
  receptionDate?: string | null;
  receptionTypeId?: Exclude<ReceptionType, 'FORMULAIRE'> | null;
}

export async function createRequeteEntite(data: CreateRequeteInput) {
  const res = await client['requetes-entite'].$post({
    json: data,
  });
  await handleRequestErrors(res);
  const result = await res.json();
  return result.data;
}
