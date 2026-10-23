import { type APIRequestContext, expect } from '@playwright/test';
import { baseUrl } from './constants';

/**
 * API helpers used to snapshot and restore the target of the admin scenarios that
 * change a habilitation. They go through the frontend `/api` proxy with the
 * browser context cookies, exactly like the app.
 */

const apiUrl = (path: string) => `${baseUrl}/api${path}`;

// The backend CSRF guard (hono/csrf, apps/backend/src/app.ts) only accepts
// mutations that look same-origin. A browser always sends these headers, the
// Playwright request context does not.
const originHeader = { origin: baseUrl, 'sec-fetch-site': 'same-origin' };

/** The three habilitation fields the admin form submits as one payload. */
export type UserHabilitation = {
  roleId: string;
  statutId: string;
  entiteId: string | null;
};

export async function getUserHabilitation(request: APIRequestContext, userId: string): Promise<UserHabilitation> {
  const response = await request.get(apiUrl(`/users/${userId}`));
  expect(response.ok(), await response.text()).toBeTruthy();
  const { data } = (await response.json()) as { data: UserHabilitation };
  return { roleId: data.roleId, statutId: data.statutId, entiteId: data.entiteId };
}

export async function setUserHabilitation(
  request: APIRequestContext,
  userId: string,
  habilitation: UserHabilitation,
): Promise<void> {
  const response = await request.patch(apiUrl(`/users/${userId}`), {
    headers: originHeader,
    data: habilitation,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** Finds a user by email within the current admin's perimeter. */
export async function findUserIdByEmail(request: APIRequestContext, email: string): Promise<string> {
  const response = await request.get(apiUrl(`/users?search=${encodeURIComponent(email)}&limit=10`));
  expect(response.ok(), await response.text()).toBeTruthy();
  const { data } = (await response.json()) as { data: { id: string; email: string }[] };
  const user = data.find((candidate) => candidate.email === email);
  expect(user, `${email} is not in the test admin perimeter, see tests/README.md`).toBeTruthy();
  return (user as { id: string }).id;
}
