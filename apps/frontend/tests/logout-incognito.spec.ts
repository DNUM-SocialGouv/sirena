import { expect, test } from '@playwright/test';
import { baseUrl, loginUrl, password, user } from './utils/constants';
import { loginWithProconnect } from './utils/login';

test('logout', async ({ browser }) => {
  const context = await browser.newContext({ httpCredentials: undefined });
  context.clearCookies();
  const page = await context.newPage();

  await loginWithProconnect(page, {
    password,
    user,
    organisation: 'Ville de paris',
  });

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(`${baseUrl}/home`);

  const monEspaceButton = page.getByRole('button', { name: 'Mon espace' });
  await monEspaceButton.click();

  const logoutButton = page.getByRole('button', { name: 'Se déconnecter de ProConnect', exact: true });
  await logoutButton.click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(loginUrl);
  const heading = page.getByRole('heading', { name: 'Connexion à SIRENA' });
  await expect(heading).toHaveText('Connexion à SIRENA');

  await context.close();
});
