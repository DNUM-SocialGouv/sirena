import { randomUUID } from 'node:crypto';
import { type APIRequestContext, expect } from '@playwright/test';
import { baseUrl } from './constants';

/**
 * API helpers used to set up (and tear down) dedicated requests for the e2e
 * scenarios, so tests never depend on nor alter seeded data. They go through
 * the frontend `/api` proxy with the browser context cookies, exactly like the app.
 */

const apiUrl = (path: string) => `${baseUrl}/api${path}`;

// The backend CSRF guard rejects body-less mutations (e.g. DELETE) unless they
// look same-origin. A browser always sends these headers, the Playwright request
// context does not.
const originHeader = { origin: baseUrl, 'sec-fetch-site': 'same-origin' };

export type DedicatedRequete = { id: string; declarantEmail: string | null };

type CreateRequeteOptions = {
  /** Declarant email, `null` for a declarant without email. Defaults to a unique yopmail address. */
  declarantEmail?: string | null;
};

/** Creates a manual request owned by the current user's entity (with its default steps). */
export async function createRequete(
  request: APIRequestContext,
  { declarantEmail }: CreateRequeteOptions = {},
): Promise<DedicatedRequete> {
  const email = declarantEmail === undefined ? `e2e-${randomUUID().slice(0, 8)}@yopmail.com` : declarantEmail;
  const response = await request.post(apiUrl('/requetes-entite'), {
    headers: originHeader,
    data: {
      receptionDate: new Date().toISOString().slice(0, 10),
      receptionTypeId: 'EMAIL',
      declarant: {
        nom: 'E2E',
        prenom: 'Traitement',
        ...(email ? { courrierElectronique: email } : {}),
      },
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const { data } = (await response.json()) as { data: { id: string } };
  return { id: data.id, declarantEmail: email };
}

/** Adds a situation assigning the request to the given entities (makes it multi-entity). */
export async function assignEntites(request: APIRequestContext, requeteId: string, entiteIds: string[]): Promise<void> {
  const response = await request.post(apiUrl(`/requetes-entite/${requeteId}/situation`), {
    headers: originHeader,
    data: { situation: { traitementDesFaits: { entites: entiteIds.map((entiteId) => ({ entiteId })) } } },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** Status of the request for the current user's entity (NOUVEAU, EN_COURS, CLOTUREE…). */
export async function getRequeteStatut(request: APIRequestContext, requeteId: string): Promise<string> {
  const response = await request.get(apiUrl(`/requetes-entite/${requeteId}`));
  expect(response.ok(), await response.text()).toBeTruthy();
  const { data } = (await response.json()) as { data: { statutId: string } };
  return data.statutId;
}

export type ProcessingStep = {
  id: string;
  nom: string | null;
  type: string;
  statutId: string | null;
  uploadedFiles: { id: string; fileName: string }[];
};

export async function getProcessingSteps(request: APIRequestContext, requeteId: string): Promise<ProcessingStep[]> {
  const response = await request.get(apiUrl(`/requete-etapes/${requeteId}/processing-steps`));
  expect(response.ok(), await response.text()).toBeTruthy();
  const { data } = (await response.json()) as { data: ProcessingStep[] };
  return data;
}

/** Downloads a step attachment through the same endpoint as the timeline link. */
export async function downloadStepFile(request: APIRequestContext, href: string) {
  const response = await request.get(new URL(href, baseUrl).toString());
  expect(response.ok(), await response.text()).toBeTruthy();
  return { body: await response.body(), contentDisposition: response.headers()['content-disposition'] ?? '' };
}

export async function deleteStep(request: APIRequestContext, stepId: string): Promise<void> {
  const response = await request.delete(apiUrl(`/requete-etapes/${stepId}`), { headers: originHeader });
  expect([200, 204, 404], `DELETE step ${stepId}: ${await response.text()}`).toContain(response.status());
}

/** Removes every step added by hand, bringing the timeline back to its default steps. */
export async function deleteManualSteps(request: APIRequestContext, requeteId: string): Promise<void> {
  const steps = await getProcessingSteps(request, requeteId);
  for (const step of steps.filter((s) => s.type === 'MANUAL')) {
    await deleteStep(request, step.id);
  }
}

/**
 * Closes a dedicated request once a test group is done, so it leaves the
 * active lists (no API deletes a request). A no-op if it is already closed.
 */
export async function closeRequete(request: APIRequestContext, requeteId: string): Promise<void> {
  const response = await request.post(apiUrl(`/requetes-entite/${requeteId}/close`), {
    headers: originHeader,
    data: {
      clotureEffectiveDate: new Date().toISOString().slice(0, 10),
      reasonIds: ['SANS_SUITE'],
      precision: 'Nettoyage automatique après les tests e2e.',
    },
  });
  expect([200, 201, 400, 409], await response.text()).toContain(response.status());
}
