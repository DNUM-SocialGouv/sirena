import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { AUTH_CONFIGS, ensureAuthenticationFileExists, getCurrentUserId } from './utils/authHelper';
import { baseUrl } from './utils/constants';

/**
 * ADMIN E2E TESTS
 *
 * Prerequisites:
 * - At least 2 users in "Gestion des utilisateurs" table
 * - Authenticated user has ENTITY_ADMIN role
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
  const userRows = allUsersTable.locator('tr[data-row-key]');
  await expect(userRows.first()).toBeVisible();

  const otherUserRows = allUsersTable.locator(`tr[data-row-key]:not([data-row-key="${currentUserId}"])`);
  const otherUserCount = await otherUserRows.count();
  expect(otherUserCount, 'Should have at least one other user besides current user').toBeGreaterThanOrEqual(1);

  // Click on manage user link
  const firstOtherUserRow = otherUserRows.first();
  const targetUserId = await firstOtherUserRow.getAttribute('data-row-key');

  if (!targetUserId) {
    throw new Error('No target user ID found');
  }

  await firstOtherUserRow.getByRole('link', { name: "Gérer l'utilisateur" }).click();

  await page.waitForURL(`${baseUrl}/admin/user/${targetUserId}`);
  await expect(page.getByRole('heading', { name: 'Modifier un utilisateur', level: 1 })).toBeVisible();

  return targetUserId;
}

test.describe('Admin Feature', () => {
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
    await expect(page.getByText("Demande d'habilitation en attente")).toBeVisible();
  });

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test('should display admin users page with tabs', async () => {
    const heading = page.getByRole('heading', {
      name: 'Gestion des utilisateurs et des habilitations',
      level: 1,
    });
    await expect(heading).toBeVisible();

    const pendingTab = page.locator('#tab-pending');
    const allUsersTab = page.locator('#tab-all');

    await expect(pendingTab).toBeVisible();
    await expect(allUsersTab).toBeVisible();

    await expect(pendingTab).toContainText("Gestion des demandes d'habilitations");
    await expect(allUsersTab).toContainText('Gestion des utilisateurs');
  });

  test('should show pending users tab by default', async () => {
    const pendingTab = page.locator('#tab-pending');
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    const pendingTable = page.getByRole('table');
    await expect(pendingTable).toBeVisible();

    const tableCaption = page.getByText("Demande d'habilitation en attente");
    await expect(tableCaption).toBeVisible();
  });

  test('should switch to all users tab', async () => {
    const allUsersTab = page.locator('#tab-all');
    await allUsersTab.click();

    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    await expect(allUsersTab).toHaveAttribute('aria-selected', 'true');

    const allUsersTable = page.getByRole('table');
    await expect(allUsersTable).toBeVisible();

    const tableCaption = page.getByText('Liste des utilisateurs');
    await expect(tableCaption).toBeVisible();
  });

  test('should go to "Modifier un utilisateur" form when clicking on "Gérer l\'utilisateur" link', async () => {
    await navigateToUserEditPage(page, context);

    const heading = page.getByRole('heading', {
      name: 'Modifier un utilisateur',
      level: 1,
    });

    await expect(heading).toBeVisible();
  });

  test('should update user status to opposite value and reflect in table', async () => {
    const targetUserId = await navigateToUserEditPage(page, context);

    const statutSelect = page.locator('select[name="statutId"]');
    await expect(statutSelect).toBeVisible();

    const currentStatus = await statutSelect.inputValue();
    const oppositeStatus = currentStatus === 'ACTIF' ? 'INACTIF' : 'ACTIF';

    await statutSelect.selectOption(oppositeStatus);
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    const [userResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/users/${targetUserId}`) && res.request().method() === 'GET'),
      page.goto(`${baseUrl}/admin/user/${targetUserId}`),
    ]);

    await expect(page.getByRole('heading', { name: 'Modifier un utilisateur', level: 1 })).toBeVisible();

    const { data: userData } = await userResponse.json();
    expect(userData).toBeTruthy();
    expect(userData.id).toBe(targetUserId);
    expect(userData.statutId).toBe(oppositeStatus);
  });

  test('should toggle user role and reset to original after verification', async () => {
    const targetUserId = await navigateToUserEditPage(page, context);

    const roleSelect = page.locator('select[name="roleId"]');
    await expect(roleSelect).toBeVisible();

    const originalRole = await roleSelect.inputValue();
    const oppositeRole = originalRole === 'PENDING' ? 'ENTITY_ADMIN' : 'PENDING';

    // PART 1: Set to opposite role
    await roleSelect.selectOption(oppositeRole);
    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    const [responseAfterChange] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/users/${targetUserId}`) && res.request().method() === 'GET'),
      page.goto(`${baseUrl}/admin/user/${targetUserId}`),
    ]);

    await expect(page.getByRole('heading', { name: 'Modifier un utilisateur', level: 1 })).toBeVisible();

    const { data: updatedUser } = await responseAfterChange.json();
    expect(updatedUser).toBeTruthy();
    expect(updatedUser.id).toBe(targetUserId);
    expect(updatedUser.roleId).toBe(oppositeRole);

    // PART 2: Revert to original role
    const resetRoleSelect = page.locator('select[name="roleId"]');
    await expect(resetRoleSelect).toBeVisible();
    await resetRoleSelect.selectOption(originalRole);

    if (oppositeRole === 'PENDING') {
      const statutSelect = page.locator('select[name="statutId"]');
      await expect(statutSelect).toBeVisible();
      await statutSelect.selectOption('ACTIF');
    }

    await page.getByRole('button', { name: 'Valider' }).click();
    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    const [responseAfterReset] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/users/${targetUserId}`) && res.request().method() === 'GET'),
      page.goto(`${baseUrl}/admin/user/${targetUserId}`),
    ]);

    await expect(page.getByRole('heading', { name: 'Modifier un utilisateur', level: 1 })).toBeVisible();

    const { data: revertedUser } = await responseAfterReset.json();
    expect(revertedUser).toBeTruthy();
    expect(revertedUser.id).toBe(targetUserId);
    expect(revertedUser.roleId).toBe(originalRole);
  });
});
