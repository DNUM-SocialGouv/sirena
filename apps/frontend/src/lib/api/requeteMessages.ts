import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export type FetchRequeteMessagesParams = {
  limit?: number;
  before?: string;
};

export async function fetchRequeteMessages(requestId: string, params: FetchRequeteMessagesParams = {}) {
  const res = await client['requete-messages'][':requeteId'].$get({
    param: { requeteId: requestId },
    query: {
      ...(params.limit ? { limit: String(params.limit) } : {}),
      ...(params.before ? { before: params.before } : {}),
    },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type PostRequeteMessageData = {
  contenu: string;
};

export async function postRequeteMessage(requestId: string, data: PostRequeteMessageData) {
  const res = await client['requete-messages'][':requeteId'].$post({
    param: { requeteId: requestId },
    json: data,
  });
  await handleRequestErrors(res, { silentToastError: true });
  return res.json();
}

export async function markRequeteDiscussionRead(requestId: string) {
  const res = await client['requete-messages'][':requeteId'].read.$post({
    param: { requeteId: requestId },
  });
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data;
}
