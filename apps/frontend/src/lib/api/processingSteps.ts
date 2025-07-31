import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export async function fetchProcessingSteps(requestId: string) {
  const res = await client['requetes-entite'][':id']['processing-steps'].$get({
    param: { id: requestId },
  });
  await handleRequestErrors(res);
  return res.json();
}

export async function addProcessingStep(requestId: string, data: { stepName: string }) {
  const res = await client['requetes-entite'][':id']['processing-steps'].$post({
    param: { id: requestId },
    json: data,
  });
  await handleRequestErrors(res);
  return res.json();
}
