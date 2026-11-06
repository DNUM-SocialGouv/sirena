import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { AUTH_CONFIGS, ensureAuthenticationFileExists, getCurrentUserId } from './utils/authHelper';
import { baseUrl, HABILITATION_TARGET_USER_EMAIL } from './utils/constants';
import { findUserIdByEmail, getUserHabilitation, setUserHabilitation, type UserHabilitation } from './utils/usersApi';

/**
 * ADMIN E2E TESTS
 *
 * Prerequisites:
 * - Authenticated user has ENTITY_ADMIN role
 * - `HABILITATION_TARGET_USER_EMAIL` provisioned in that user's perimeter (see tests/README.md)
 */

/**
 * Id of the account the habilitation scenarios open and modify. Never the signed-in
 * admin: deactivating it makes userStatusMiddleware answer 403 to every later request,
 * the restoring PATCH included, so the account would stay locked out.
 */
async function findHabilitationTargetId(context: BrowserContext): Promise<string> {
  const targetUserId = await findUserIdByEmail(context.request, HABILITATION_TARGET_USER_EMAIL);
  const currentUserId = await getCurrentUserId(context);
  expect(targetUserId, `${HABILITATION_TARGET_USER_EMAIL} is the signed-in admin account`).not.toBe(currentUserId);
  return targetUserId;
}

/**
 * Opens the edit form of the habilitation target from the users list: the default list
 * must show rows, then its search narrows the list to the target, so that its row is on
 * the first page whatever the size of the perimeter.
 */
async function navigateToTargetEditPage(page: Page, targetUserId: string): Promise<void> {
  await page.goto(`${baseUrl}/admin/users/all`);
  const userRows = page.getByRole('table').getByTestId('datatable-row');
  await expect(userRows.first()).toBeVisible();

  const search = page.getByRole('search');
  await search
    .getByRole('searchbox', { name: 'Rechercher un utilisateur par nom, prénom ou e-mail', exact: true })
    .fill(HABILITATION_TARGET_USER_EMAIL);
  await search.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await expect(page).toHaveURL(/[?&]search=/);

  await userRows
    .and(page.locator(`[data-row-key="${targetUserId}"]`))
    .getByRole('link', { name: "Gérer l'utilisateur", exact: true })
    .click();

  await page.waitForURL(`${baseUrl}/admin/user/${targetUserId}`);
  await expect(page.getByRole('heading', { name: 'Modifier les informations', level: 1 })).toBeVisible();
  await expect(page.getByTestId('user-role-select')).toBeVisible();
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
    // The dedicated target rather than any other row: on integration, the other rows are real agents.
    await navigateToTargetEditPage(page, await findHabilitationTargetId(context));

    const heading = page.getByRole('heading', {
      name: 'Modifier les informations',
      level: 1,
    });

    await expect(heading).toBeVisible();
  });

  test.describe("Modification d'une habilitation", () => {
    let targetUserId: string;
    let pristineHabilitation: UserHabilitation;
    let hasPristine = false;

    test.beforeEach(async () => {
      targetUserId = await findHabilitationTargetId(context);
      // Captured once for the whole file, never re-read: a restore that fails leaves the
      // account modified, and re-reading would take that state for the original one.
      if (!hasPristine) {
        pristineHabilitation = await getUserHabilitation(context.request, targetUserId);
        hasPristine = true;
      }
      // Both scenarios require an enabled account, even if the target is pending.
      await setUserHabilitation(context.request, targetUserId, {
        ...pristineHabilitation,
        roleId: ROLES.READER,
        statutId: STATUT_TYPES.ACTIF,
      });
      await openUserEditPage(page, targetUserId);
      await expect(page.getByTestId('user-role-select')).toHaveValue(ROLES.READER);
      await expect(page.getByTestId('user-statut-select')).toHaveValue(STATUT_TYPES.ACTIF);
    });

    // Through the API and not the form, so an aborted assertion still restores.
    test.afterEach(async () => {
      if (!hasPristine) {
        return;
      }
      await setUserHabilitation(context.request, targetUserId, pristineHabilitation);
    });

    test("inverse le statut d'un utilisateur et le reflète dans le tableau", async () => {
      const statutSelect = page.getByTestId('user-statut-select');
      await expect(statutSelect).toBeVisible();

      await statutSelect.selectOption(STATUT_TYPES.INACTIF);
      await saveUserForm(page);

      const saved = await getUserHabilitation(context.request, targetUserId);
      expect(saved.statutId).toBe(STATUT_TYPES.INACTIF);
    });

    test("change le rôle d'un utilisateur et le reflète dans le tableau", async () => {
      await page.getByTestId('user-role-select').selectOption(ROLES.WRITER);
      await saveUserForm(page);

      const saved = await getUserHabilitation(context.request, targetUserId);
      expect(saved.roleId).toBe(ROLES.WRITER);
    });
  });
});
