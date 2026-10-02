import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';

/**
 * Back links (RGAA 6.1): a back link targets a previous page, so it must never be
 * announced as the current page, and its label must match where it leads.
 *
 * Prerequisites:
 * - At least 1 requête in "/home" and 1 user in the "Utilisateurs" tab
 * - Authenticated user has ENTITY_ADMIN role
 */
test.describe('Back links', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
    context = await browser.newContext({ storageState: authFile });
    await autoCloseAnnouncements(context);
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('request form back links are not flagged as the current page', async () => {
    await page.goto(`${baseUrl}/home`);
    const firstRow = page.getByRole('table').getByTestId('datatable-row').first();
    await expect(firstRow).toBeVisible();
    const requestId = await firstRow.getAttribute('data-row-key');

    const cases = [
      { path: '/request/create/declarant', label: 'Retour', href: '/request/create' },
      { path: `/request/${requestId}/declarant`, label: 'Retour', href: `/request/${requestId}` },
      { path: `/request/${requestId}/situation`, label: 'Détails de la requête', href: `/request/${requestId}` },
    ];
    for (const { path, label, href } of cases) {
      await page.goto(`${baseUrl}${path}`);
      const backLink = page.getByRole('link', { name: label, exact: true });
      await expect(backLink).toHaveAttribute('href', href);
      await expect(backLink).not.toHaveAttribute('aria-current');
    }
  });

  test('the user page goes back to the "Utilisateurs" list it was opened from', async () => {
    await page.goto(`${baseUrl}/admin/users/all`);
    await page.getByRole('table').getByTestId('user-row-link').first().click();
    await expect(
      page.getByRole('heading', { name: "Modifier les informations de l'utilisateur", level: 1 }),
    ).toBeVisible();

    const backLink = page.getByRole('link', { name: 'Liste des utilisateurs', exact: true });
    await expect(backLink).toHaveAttribute('href', '/admin/users/all');
    await expect(backLink).not.toHaveAttribute('aria-current');

    // The list it came from is only kept in memory: after a reload the target stays consistent.
    await page.reload();
    await expect(page.getByRole('link', { name: 'Liste des utilisateurs', exact: true })).toHaveAttribute(
      'href',
      '/admin/users/all',
    );

    await backLink.click();
    await expect(page).toHaveURL(`${baseUrl}/admin/users/all`);
  });
});
