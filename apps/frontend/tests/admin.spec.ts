import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { AUTH_CONFIGS, ensureAuthenticationFileExists, getCurrentUserId } from './utils/authHelper';
import { baseUrl, HABILITATION_TARGET_USER_EMAIL } from './utils/constants';
import { findUserIdByEmail, getUserHabilitation, setUserHabilitation, type UserHabilitation } from './utils/usersApi';

/**
 * ADMIN E2E TESTS
 *
 * Prerequisites:
 * - At least 2 users in "Gestion des utilisateurs" table
 * - Authenticated user has ENTITY_ADMIN role
 * - `HABILITATION_TARGET_USER_EMAIL` provisioned in that user's perimeter (see tests/README.md)
 */

/**
 * Helper function to navigate to a random user edit page (excluding the current user)
 */
async function navigateToUserEditPage(page: Page, context: BrowserContext): Promise<string> {
  await page.goto(`${baseUrl}/admin/users/all`);
  const allUsersTable = page.getByRole('table');
  await expect(allUsersTable).toBeVisible();

  // Find a user that is not the current user (can't update our own user)
  const currentUserId = await getCurrentUserId(context);
  const userRows = allUsersTable.getByTestId('datatable-row');
  await expect(userRows.first()).toBeVisible();

  const otherUserRows = userRows.and(page.locator(`:not([data-row-key="${currentUserId}"])`));
  const otherUserCount = await otherUserRows.count();
  expect(otherUserCount, 'Should have at least one other user besides current user').toBeGreaterThanOrEqual(1);

  // Click on manage user link
  const firstOtherUserRow = otherUserRows.first();
  const targetUserId = await firstOtherUserRow.getAttribute('data-row-key');

  if (!targetUserId) {
    throw new Error('No target user ID found');
  }

  await firstOtherUserRow.getByTestId('user-row-link').click();

  await page.waitForURL(`${baseUrl}/admin/user/${targetUserId}`);
  await expect(page.getByRole('heading', { name: 'Modifier les informations', level: 1 })).toBeVisible();
  await expect(page.getByTestId('user-role-select')).toBeVisible();

  return targetUserId;
}

/** Opens the edit form of a named user, without going through the list. */
async function openUserEditPage(page: Page, userId: string): Promise<void> {
  await page.goto(`${baseUrl}/admin/user/${userId}`);
  await expect(page.getByRole('heading', { name: 'Modifier les informations', level: 1 })).toBeVisible();
  await expect(page.getByTestId('user-role-select')).toBeVisible();
}

/**
 * Submits the form and waits for the server to acknowledge the save. The page then
 * goes back in history, so its destination depends on how the form was reached —
 * only the response is a reliable signal. Its status is read, never its body: a
 * body captured across a navigation is released before it can be parsed.
 */
async function saveUserForm(page: Page): Promise<void> {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/users/') && res.request().method() === 'PATCH'),
    page.getByRole('button', { name: /Modifier les informations de l.utilisateur/ }).click(),
  ]);
  expect(response.ok(), `PATCH /users answered ${response.status()}`).toBeTruthy();
}

test.describe('Administration des utilisateurs', () => {
  let context: BrowserContext;
  let page: Page;
  let authFile: string;

  // Setup authentication once for all tests
  test.beforeAll(async ({ browser }) => {
    authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: authFile });
    page = await context.newPage();

    await page.goto(`${baseUrl}/admin/users`);
    await expect(page.getByTestId('admin-tab-pending')).toBeVisible();
  });

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test("affiche la page d'administration des utilisateurs avec ses onglets", async () => {
    const heading = page.getByRole('heading', {
      name: 'Espace administrateur',
      level: 1,
    });
    await expect(heading).toBeVisible();

    const pendingTab = page.getByTestId('admin-tab-pending');
    const allUsersTab = page.getByTestId('admin-tab-all');

    await expect(pendingTab).toBeVisible();
    await expect(allUsersTab).toBeVisible();

    await expect(pendingTab).toContainText("Demandes d'habilitation");
    await expect(allUsersTab).toContainText('Utilisateurs');
  });

  test("affiche l'onglet des demandes d'habilitation par défaut", async () => {
    const pendingTab = page.getByTestId('admin-tab-pending');
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    const pendingTable = page.getByRole('table');
    await expect(pendingTable).toBeVisible();

    const tableCaption = page.getByRole('heading', { name: "Demande d'habilitation en attente", level: 2 });
    await expect(tableCaption).toBeVisible();
  });

  test("bascule sur l'onglet de tous les utilisateurs", async () => {
    const allUsersTab = page.getByTestId('admin-tab-all');
    await allUsersTab.click();

    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    await expect(allUsersTab).toHaveAttribute('aria-selected', 'true');

    const allUsersTable = page.getByRole('table');
    await expect(allUsersTable).toBeVisible();

    const tableCaption = page.getByRole('heading', { name: 'Liste des utilisateurs', level: 2 });
    await expect(tableCaption).toBeVisible();
  });

  test("ouvre le formulaire « Modifier les informations » depuis le lien « Gérer l'utilisateur »", async () => {
    await navigateToUserEditPage(page, context);

    const heading = page.getByRole('heading', {
      name: 'Modifier les informations',
      level: 1,
    });

    await expect(heading).toBeVisible();
  });

  test.describe("Modification d'une habilitation", () => {
    let targetUserId: string;
    let initialHabilitation: UserHabilitation;
    let snapshotTaken = false;

    test.beforeEach(async () => {
      snapshotTaken = false;
      targetUserId = await findUserIdByEmail(context.request, HABILITATION_TARGET_USER_EMAIL);
      initialHabilitation = await getUserHabilitation(context.request, targetUserId);
      snapshotTaken = true;
      await openUserEditPage(page, targetUserId);
    });

    // Through the API and not the form, so an aborted assertion still restores.
    test.afterEach(async () => {
      if (!snapshotTaken) {
        return;
      }
      await setUserHabilitation(context.request, targetUserId, initialHabilitation);
    });

    test("inverse le statut d'un utilisateur et le reflète dans le tableau", async () => {
      const statutSelect = page.getByTestId('user-statut-select');
      await expect(statutSelect).toBeVisible();

      const oppositeStatus =
        initialHabilitation.statutId === STATUT_TYPES.ACTIF ? STATUT_TYPES.INACTIF : STATUT_TYPES.ACTIF;
      await statutSelect.selectOption(oppositeStatus);
      await saveUserForm(page);

      const saved = await getUserHabilitation(context.request, targetUserId);
      expect(saved.statutId).toBe(oppositeStatus);
    });

    test("change le rôle d'un utilisateur et le reflète dans le tableau", async () => {
      const otherRole = initialHabilitation.roleId === ROLES.READER ? ROLES.WRITER : ROLES.READER;
      await page.getByTestId('user-role-select').selectOption(otherRole);
      await saveUserForm(page);

      const saved = await getUserHabilitation(context.request, targetUserId);
      expect(saved.roleId).toBe(otherRole);
    });
  });
});
