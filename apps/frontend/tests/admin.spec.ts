import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { AUTH_CONFIGS, ensureAuthenticated, getCurrentUserId } from './utils/authHelper';
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
  await page.goto(`${baseUrl}/admin/users`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(`${baseUrl}/admin/users`);

  // Click on all users tab
  const allUsersTab = page.locator('#tab-all');
  await allUsersTab.click();
  await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

  const allUsersTable = page.getByRole('table');
  await expect(allUsersTable).toBeVisible();
  await page.waitForLoadState('networkidle');

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

  const manageUserLink = firstOtherUserRow.getByRole('link', { name: "Gérer l'utilisateur" });

  await Promise.all([page.waitForURL(`${baseUrl}/admin/user/${targetUserId}`), manageUserLink.click()]);

  return targetUserId;
}

test.describe('Admin Feature', () => {
  let context: BrowserContext;
  let page: Page;
  let authFile: string;

  // Setup authentication once for all tests
  test.beforeAll(async ({ browser }) => {
    authFile = await ensureAuthenticated(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: authFile });
    page = await context.newPage();

    await page.goto(`${baseUrl}/admin/users`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(`${baseUrl}/admin/users`);
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

    // Determine opposite status
    const oppositeStatus = currentStatus === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    const oppositeStatusLabel = oppositeStatus === 'ACTIF' ? 'Actif' : 'Inactif';

    // Apply the opposite status
    await statutSelect.selectOption(oppositeStatus);

    const submitButton = page.getByRole('button', { name: 'Valider' });
    await Promise.all([submitButton.click()]);

    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    const allUsersTable = page.getByRole('table');
    await expect(allUsersTable).toBeVisible();

    // Verify the change is reflected specifically in the target user's row
    const targetUserRow = allUsersTable.locator(`tr[data-row-key="${targetUserId}"]`);
    const statutCell = targetUserRow.getByRole('cell', { name: oppositeStatusLabel });
    await expect(statutCell).toBeVisible();
  });

  test('should move user from active role to pending and back to active role', async () => {
    const targetUserId = await navigateToUserEditPage(page, context);

    const roleSelect = page.locator('select[name="roleId"]');
    await expect(roleSelect).toBeVisible();

    // Store original role for later verification
    const originalRole = await roleSelect.inputValue();

    // === PART 1: Set role to "En attente d'affectation" (PENDING) ===
    await roleSelect.selectOption('PENDING');

    await page.getByRole('button', { name: 'Valider' }).click();

    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    // Navigate to pending tab to verify user appears there
    const pendingTab = page.locator('#tab-pending');
    await pendingTab.click();
    await expect(page).toHaveURL(`${baseUrl}/admin/users`);

    const pendingTable = page.getByRole('table');
    await expect(pendingTable).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Verify the user appears in the pending tab
    const targetUserRowInPending = pendingTable.locator(`tr[data-row-key="${targetUserId}"]`);
    await expect(targetUserRowInPending).toBeVisible();

    const actionLink = targetUserRowInPending.getByRole('link', { name: 'Traiter la demande' });
    await expect(actionLink).toBeVisible();

    // === PART 2: Move user back to active role ===
    await Promise.all([page.waitForURL(`${baseUrl}/admin/user/${targetUserId}`), actionLink.click()]);

    // Set back to original active role
    const resetRoleSelect = page.locator('select[name="roleId"]');
    await expect(resetRoleSelect).toBeVisible();
    await resetRoleSelect.selectOption(originalRole);

    // Set status to INACTIF (required when moving from pending)
    const statutSelect = page.locator('select[name="statutId"]');
    await expect(statutSelect).toBeVisible();
    await statutSelect.selectOption('INACTIF');

    await page.getByRole('button', { name: 'Valider' }).click();

    await expect(page).toHaveURL(`${baseUrl}/admin/users`);

    // === PART 3: Verify user is back in "all users" tab ===
    await page.locator('#tab-all').click();
    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);

    const allUsersTable = page.getByRole('table');
    await expect(allUsersTable).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Verify the user appears in the all users tab with original role
    const targetUserRowInAll = allUsersTable.locator(`tr[data-row-key="${targetUserId}"]`);
    await expect(targetUserRowInAll).toBeVisible();
  });
});
