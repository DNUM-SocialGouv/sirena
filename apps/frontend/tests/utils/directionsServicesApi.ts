import { type APIRequestContext, expect } from '@playwright/test';
import { baseUrl } from './constants';

/**
 * API helpers for the local admin "Directions et services" pages. They go through
 * the frontend `/api` proxy with the browser context cookies, exactly like the app.
 */

const apiUrl = (path: string) => `${baseUrl}/api${path}`;

// The backend CSRF guard only accepts mutations that look same-origin.
const originHeader = { origin: baseUrl, 'sec-fetch-site': 'same-origin' };

/** Name of the direction the e2e tests create when the admin's entity has none. */
export const E2E_DIRECTION = { nomComplet: 'Direction e2e', label: 'E2E' };

export type CreationCapabilities = { canCreateDirection: boolean; canCreateService: boolean };

export async function getCreationCapabilities(request: APIRequestContext): Promise<CreationCapabilities> {
  const response = await request.get(apiUrl('/entites/admin/directions-services'));
  expect(response.ok(), await response.text()).toBeTruthy();
  const { capabilities } = (await response.json()) as { capabilities: CreationCapabilities };
  return capabilities;
}

/**
 * A service can only be created under an active direction. When the admin's entity
 * has none yet, creates the e2e direction once: it is kept afterwards (no API deletes
 * an entity), so later runs find an active direction and create nothing.
 */
export async function ensureServiceCreationAllowed(request: APIRequestContext): Promise<CreationCapabilities> {
  const capabilities = await getCreationCapabilities(request);
  if (capabilities.canCreateService || !capabilities.canCreateDirection) {
    return capabilities;
  }

  const response = await request.post(apiUrl('/entites/admin/directions-services/directions'), {
    headers: originHeader,
    data: { ...E2E_DIRECTION, email: '' },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return getCreationCapabilities(request);
}
