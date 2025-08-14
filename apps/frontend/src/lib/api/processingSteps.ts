import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export async function fetchProcessingSteps(requestId: string) {
  const res = await client['requetes-entite'][':id']['processing-steps'].$get({
    param: { id: requestId },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type AddProcessingStepData = {
  stepName: string;
};

export async function addProcessingStep(requestId: string, data: AddProcessingStepData) {
  const res = await client['requetes-entite'][':id']['processing-steps'].$post({
    param: { id: requestId },
    json: data,
  });
  await handleRequestErrors(res);
  return res.json();
}

export type AddProcessingStepNoteData = {
  content: string;
  requeteStateId: string;
};

export async function addProcessingStepNote(requestid: string, data: AddProcessingStepNoteData) {
  const res = await client['requetes-entite'][':id']['processing-steps'][':stateId']['note'].$post({
    param: { id: requestid, stateId: data.requeteStateId },
    json: {
      content: data.content,
    },
  });
  await handleRequestErrors(res);
  return res.json();
}
