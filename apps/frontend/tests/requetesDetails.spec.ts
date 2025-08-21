import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { randomUUID } from 'crypto';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';

/**
 * Request Details E2E TESTS
 *
 * Prerequisites:
 * - At least 1 requête exists in "/home"
 * - User has ENTITY_ADMIN role
 */

test.describe('Request Details Feature', () => {
  let context: BrowserContext;
  let page: Page;
  let authFile: string;
  let requestUuid: string;

  test.beforeAll(async ({ browser }) => {
    authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: authFile });
    page = await context.newPage();

    await page.goto(`${baseUrl}/home`);
    await expect(page.getByText(/Bienvenue/)).toBeVisible();

    const requetesTable = page.getByRole('table');
    await expect(requetesTable).toBeVisible();
    const firstRow = requetesTable.locator('tbody tr').first();
    const uuid = await firstRow.getAttribute('data-row-key');
    expect(uuid).toBeTruthy();

    requestUuid = uuid as string;

    const viewRequestButton = firstRow.getByRole('link', { name: 'Voir la requête' });
    await viewRequestButton.click();

    await expect(page).toHaveURL(`${baseUrl}/request/${requestUuid}`);
  });

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test('should navigate to request detail page from table', async () => {
    await expect(page.getByRole('heading', { name: `Requête n°${requestUuid}`, level: 1 })).toBeVisible();
  });

  test('should add a processing step and see it after reload', async () => {
    const randomStepName = `test-${randomUUID()}}`;
    await page.getByRole('tab', { name: 'Traitement' }).click();

    await page.getByRole('button', { name: 'Ajouter une étape' }).click();

    const inputEtape = page.getByLabel("Nom de l'étape");
    await expect(inputEtape).toBeVisible();
    await inputEtape.fill(randomStepName);

    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

    await page.reload();

    await page.getByRole('tab', { name: 'Traitement' }).click();

    await expect(page.getByRole('heading', { name: randomStepName, level: 3 })).toBeVisible();
  });
});
