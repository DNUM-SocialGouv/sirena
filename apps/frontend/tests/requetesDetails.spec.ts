import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';

/**
 * Request Details E2E TESTS
 *
 * Prerequisites:
 * - At least 1 requête exists in "/home"
 * - User has ENTITY_ADMIN role
 */

test.describe("Détail d'une requête", () => {
  let context: BrowserContext;
  let page: Page;
  let authFile: string;
  let requestUuid: string;

  test.beforeAll(async ({ browser }) => {
    authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: authFile });
    await autoCloseAnnouncements(context);
    page = await context.newPage();

    // Exclure les requêtes clôturées : elles sont en lecture seule (bouton « Ajouter une étape » masqué).
    await page.goto(`${baseUrl}/home?statutIds=NOUVEAU,EN_COURS,TRAITEE`);
    await expect(page.getByTestId('home-title')).toBeVisible();

    const requetesTable = page.getByRole('table');
    await expect(requetesTable).toBeVisible();

    const firstRow = requetesTable.getByTestId('datatable-row').first();
    await expect(firstRow).toBeVisible();

    await expect(firstRow).toHaveAttribute('data-row-key');

    const uuid = await firstRow.getAttribute('data-row-key');
    expect(uuid).toBeTruthy();

    requestUuid = uuid as string;

    const viewRequestButton = firstRow.getByTestId('requete-row-link');
    await viewRequestButton.click();

    await expect(page).toHaveURL(`${baseUrl}/request/${requestUuid}`);
  });

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test("ouvre le détail d'une requête depuis le tableau", async () => {
    await expect(page.getByRole('heading', { name: `Requête ${requestUuid}`, level: 1 })).toBeVisible();
  });
});
