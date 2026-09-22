import { expect, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { baseUrl, ENTITY_ADMIN_USER, isLocalTarget, loginUrl } from './utils/constants';
import { loginWithProconnect } from './utils/login';

test('logout', async ({ browser }) => {
  test.skip(isLocalTarget, 'ProConnect flow is not exercised in local target.');
  const context = await browser.newContext({ httpCredentials: undefined });
  context.clearCookies();
  await autoCloseAnnouncements(context);
  const page = await context.newPage();

  await loginWithProconnect(page, {
    password: ENTITY_ADMIN_USER.password,
    user: ENTITY_ADMIN_USER.user,
    organisation: 'Commune de clamart - Mairie',
  });

  await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: 'Liste des requêtes', level: 1 })).toBeVisible({ timeout: 10000 });

  const monEspaceButton = page.getByRole('button', { name: 'Mon espace' });
  await monEspaceButton.click();

  const logoutButton = page.getByRole('button', { name: 'Se déconnecter de ProConnect', exact: true });
  await logoutButton.click();

  await page.waitForURL(loginUrl, { timeout: 15000 });
  await expect(page).toHaveURL(loginUrl);
  const heading = page.getByRole('heading', { name: 'Connexion à SIRENA' });
  await expect(heading).toHaveText('Connexion à SIRENA');

  await context.close();
});
