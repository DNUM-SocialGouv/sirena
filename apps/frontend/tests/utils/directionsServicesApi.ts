import { type APIRequestContext, expect } from '@playwright/test';
import { apiUrl, originHeader } from './api';

/** API helpers for the local admin "Directions et services" pages. */

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
 * has none, creates the e2e direction. A local admin can neither delete nor deactivate
 * it, so it stays active and later runs create nothing.
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
  // Re-read rather than assumed, so that the spec checks what the backend now allows.
  return getCreationCapabilities(request);
}
