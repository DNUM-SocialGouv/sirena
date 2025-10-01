import type { RequeteStatutType } from '@sirena/common/constants';
import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export async function fetchProcessingSteps(requestId: string) {
  const res = await client['requete-etapes'][':id']['processing-steps'].$get({
    param: { id: requestId },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type AddProcessingStepData = {
  nom: string;
};

export async function addProcessingStep(requestId: string, data: AddProcessingStepData) {
  const res = await client['requete-etapes'][':id']['processing-steps'].$post({
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
  const res = await client.notes.$post({
    json: { texte: data.texte, fileIds: data.fileIds, requeteEtapeId: stepId },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type UpdateProcessingStepNoteData = {
  texte: string;
  fileIds: string[];
};

export async function updateProcessingStepNote(noteId: string, data: UpdateProcessingStepNoteData) {
  const res = await client.notes[':id'].$patch({
    param: { id: noteId },
    json: { texte: data.texte, fileIds: data.fileIds },
  });
  await handleRequestErrors(res);
  return res.json();
}

export async function deleteProcessingStepNote(noteId: string) {
  const res = await client.notes[':noteId'].$delete({
    param: { noteId: noteId },
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
