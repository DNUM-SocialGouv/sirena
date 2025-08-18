import type { RequeteStatutType } from '@sirena/common/constants';
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

export type UpdateProcessingStepStatusData = {
  statutId: RequeteStatutType;
};

export async function updateProcessingStepStatus(stepId: string, data: UpdateProcessingStepStatusData) {
  const res = await client['requete-states'][':id'].statut.$patch({
    param: { id: stepId },
    json: data,
  });
  await handleRequestErrors(res);
  return res.json();
}
