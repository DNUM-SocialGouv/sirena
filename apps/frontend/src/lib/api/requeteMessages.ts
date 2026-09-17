import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors, type RequestErrorOptions } from '@/lib/api/tanstackQuery.ts';

export type FetchRequeteMessagesParams = {
  limit?: number;
  before?: string;
  after?: string;
};

export async function fetchRequeteMessages(
  requestId: string,
  params: FetchRequeteMessagesParams = {},
  options: RequestErrorOptions = {},
) {
  const res = await client['requete-messages'][':requeteId'].$get({
    param: { requeteId: requestId },
    query: {
      ...(params.limit ? { limit: String(params.limit) } : {}),
      ...(params.before ? { before: params.before } : {}),
      ...(params.after ? { after: params.after } : {}),
    },
  });
  await handleRequestErrors(res, options);
  return res.json();
}

export type PostRequeteMessageData = {
  contenu: string;
  fileIds: string[];
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

export async function fetchRequeteUnreadCount(requestId: string) {
  const res = await client['requete-messages'][':requeteId']['unread-count'].$get({
    param: { requeteId: requestId },
  });
  await handleRequestErrors(res, { silentToastError: true });
  const { data } = await res.json();
  return data.unreadCount;
}
