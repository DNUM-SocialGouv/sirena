import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';
import type { QueryParams } from '@/types/pagination.type.ts';

export async function fetchRequetesEntite(query: QueryParams = {}) {
  const res = await client['requetes-entite'].$get({
    query: {
      ...query,
      limit: query.limit?.toString(),
      offset: query.offset?.toString(),
    },
  });
  await handleRequestErrors(res);
  const { data, meta } = await res.json();
  return { data, meta };
}

export type CloseRequeteData = {
  reasonIds: string[];
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

export async function fetchRequeteDetails(requestId: string) {
  const res = await client['requetes-entite'][':id'].$get({
    param: { id: requestId },
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export async function fetchRequeteOtherEntitiesAffected(requestId: string) {
  const res = await client['requetes-entite'][':id']['other-entites-affected'].$get({
    param: { id: requestId },
  });
  await handleRequestErrors(res);
  const { data } = await res.json();
  return data;
}

export type UpdatePrioriteData = {
  prioriteId: 'BASSE' | 'MOYENNE' | 'HAUTE' | null;
};

export async function updatePriorite(requestId: string, json: UpdatePrioriteData) {
  const res = await client['requetes-entite'][':id'].priorite.$patch({
    param: { id: requestId },
    json,
  });

  await handleRequestErrors(res);

  const response = await res.json();
  return response;
}
