import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';
import type { QueryParams } from '@/types/pagination.type.ts';

export async function fetchRequetesEntite(query: QueryParams = {}) {
  const res = await client['requetes-entite'].$get({ query });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
}

export type CloseRequeteData = {
  reasonId: string;
  precision?: string;
  fileIds?: string[];
};

export async function closeRequete(requestId: string, json: CloseRequeteData) {
  const x = await client['requetes-entite'][':id'].close.$post({
    param: { id: requestId },
    json,
  });

  await handleRequestErrors(x);

  const response = await x.json();
  return response;
}
