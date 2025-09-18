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
  nom: string;
};

export async function addProcessingStep(requestId: string, data: AddProcessingStepData) {
  const res = await client['requetes-entite'][':id']['processing-steps'].$post({
    param: { id: requestId },
    json: { nom: data.nom },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type UpdateProcessingStepStatusData = {
  statutId: RequeteStatutType;
};

export async function updateProcessingStepStatus(stepId: string, data: UpdateProcessingStepStatusData) {
  const res = await client['requete-etapes'][':id'].statut.$patch({
    param: { id: stepId },
    json: data,
  });
  await handleRequestErrors(res);
  return res.json();
}

export type AddProcessingStepNoteData = {
  texte: string;
  fileIds: string[];
};

export async function addProcessingStepNote(stepId: string, data: AddProcessingStepNoteData) {
  const res = await client['requete-etapes'][':id'].note.$post({
    param: { id: stepId },
    json: { texte: data.texte, fileIds: data.fileIds },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type UpdateProcessingStepNoteData = {
  texte: string;
  fileIds: string[];
};

export async function updateProcessingStepNote(stepId: string, noteId: string, data: UpdateProcessingStepNoteData) {
  const res = await client['requete-etapes'][':id'].note[':noteId'].$patch({
    param: { id: stepId, noteId: noteId },
    json: { texte: data.texte, fileIds: data.fileIds },
  });
  await handleRequestErrors(res);
  return res.json();
}

export async function deleteProcessingStepNote(stepId: string, noteId: string) {
  const res = await client['requete-etapes'][':id'].note[':noteId'].$delete({
    param: { id: stepId, noteId: noteId },
  });
  await handleRequestErrors(res);
  return;
}

export type UpdateProcessingStepNameData = {
  nom: string;
};

export async function updateProcessingStepName(stepId: string, data: UpdateProcessingStepNameData) {
  const res = await client['requete-etapes'][':id'].nom.$patch({
    param: { id: stepId },
    json: data,
  });
  await handleRequestErrors(res);
  return res.json();
}

export async function deleteProcessingStep(stepId: string) {
  const res = await client['requete-etapes'][':id'].$delete({
    param: { id: stepId },
  });
  await handleRequestErrors(res);
  return;
}
