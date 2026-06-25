import type { RequeteEtapeStatutType } from '@sirena/common/constants';
import { client } from '@/lib/api/hc.ts';
import { handleRequestErrors } from '@/lib/api/tanstackQuery.ts';

export async function fetchProcessingSteps(requestId: string) {
  const res = await client['requete-etapes'][':id']['processing-steps'].$get({
    param: { id: requestId },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type ProcessingStepStatut = Exclude<RequeteEtapeStatutType, 'EN_COURS' | 'CLOTUREE'>;

export type ProcessingStepNoteInput = {
  id?: string;
  texte: string;
};

export type AddProcessingStepData = {
  nom: string;
  statutId?: ProcessingStepStatut;
  dateRealisation?: string;
  notes?: { texte: string }[];
  fileIds?: string[];
};

export async function addProcessingStep(requestId: string, data: AddProcessingStepData) {
  const res = await client['requete-etapes'][':id']['processing-steps'].$post({
    param: { id: requestId },
    json: {
      nom: data.nom,
      ...(data.statutId ? { statutId: data.statutId } : {}),
      ...(data.dateRealisation ? { dateRealisation: data.dateRealisation } : {}),
      notes: data.notes ?? [],
      fileIds: data.fileIds ?? [],
    },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type UpdateProcessingStepData = {
  nom: string;
  statutId?: ProcessingStepStatut | null;
  dateRealisation?: string;
  notes: ProcessingStepNoteInput[];
  fileIds: string[];
};

export async function updateProcessingStep(stepId: string, data: UpdateProcessingStepData) {
  const res = await client['requete-etapes'][':id'].$patch({
    param: { id: stepId },
    json: {
      nom: data.nom,
      statutId: data.statutId ?? null,
      ...(data.dateRealisation ? { dateRealisation: data.dateRealisation } : {}),
      notes: data.notes,
      fileIds: data.fileIds,
    },
  });
  await handleRequestErrors(res);
  return res.json();
}

export type UpdateProcessingStepStatusData = {
  statutId: Exclude<RequeteEtapeStatutType, 'CLOTUREE'>;
};

export async function updateProcessingStepStatus(stepId: string, data: UpdateProcessingStepStatusData) {
  const res = await client['requete-etapes'][':id'].statut.$patch({
    param: { id: stepId },
    json: data,
  });
  await handleRequestErrors(res);
  return res.json();
}

export type AddClotureFilesData = {
  fileIds: string[];
};

export async function addClotureFiles(stepId: string, data: AddClotureFilesData) {
  const res = await client['requete-etapes'][':id']['cloture-files'].$post({
    param: { id: stepId },
    json: { fileIds: data.fileIds },
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

export async function fetchAcknowledgmentMessage(
  stepId: string,
): Promise<{ message: string; declarantEmail: string | null; subject: string }> {
  const res = await fetch(`/api/requete-etapes/${encodeURIComponent(stepId)}/acknowledgment-message`, {
    credentials: 'include',
  });
  await handleRequestErrors(res);
  const json = (await res.json()) as { data: { message: string; declarantEmail: string | null; subject: string } };
  return json.data;
}

export async function sendAcknowledgment(stepId: string, data: { comment?: string }) {
  const res = await fetch(`/api/requete-etapes/${encodeURIComponent(stepId)}/send-acknowledgment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  await handleRequestErrors(res, { silentToastError: true });
  return res.json();
}
