import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';

/**
 * Home Requetes E2E TESTS
 *
 * Prerequisites:
 * - At least 1 requete in "/home" table
 * - Authenticated user has ENTITY_ADMIN role
 */

test.describe('Requete Feature', () => {
  let context: BrowserContext;
  let page: Page;
  let authFile: string;

  test.beforeAll(async ({ browser }) => {
    authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: authFile });
    page = await context.newPage();

    await page.goto(`${baseUrl}/home`);
    await expect(page.getByText(/Bienvenue/)).toBeVisible();
  });

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test('should display home page with welcome message', async () => {
    const heading = page.getByRole('heading', {
      name: 'Bienvenue',
      level: 1,
    });

    await expect(heading).toBeVisible();
  });

  test('should display requetes table with at least 1 requete', async () => {
    const requetesTable = page.getByRole('table');
    await expect(requetesTable).toBeVisible();

    const requetesRows = requetesTable.locator('tbody tr');
    const count = await requetesRows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should navigate to request detail page when clicking "Voir la requête"', async () => {
    const requetesTable = page.getByRole('table');
    await expect(requetesTable).toBeVisible();

    const firstRow = requetesTable.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    const requestUuid = await firstRow.getAttribute('data-row-key');
    expect(requestUuid).toBeTruthy();

    const viewRequestButton = firstRow.getByRole('link', { name: 'Voir la requête' });
    await expect(viewRequestButton).toBeVisible();
    await viewRequestButton.click();

    await expect(page).toHaveURL(`${baseUrl}/request/${requestUuid}`);

    await expect(page.getByRole('heading', { name: `Requête n°${requestUuid}` })).toBeVisible();
  });
});
