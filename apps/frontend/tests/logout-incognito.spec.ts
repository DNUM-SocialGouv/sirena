import { expect, test } from '@playwright/test';
import { loginUrl, password, user } from './utils/constants';
import { loginWithProconnect } from './utils/login';

test('logout', async ({ browser }) => {
  const context = await browser.newContext({ httpCredentials: undefined });
  context.clearCookies();
  const page = await context.newPage();

  await loginWithProconnect(page, {
    password,
    user,
    organisation: 'Commune de gap - Mairie',
  });

  const logoutButton = page.getByRole('button', { name: 'Logout', exact: true });
  await logoutButton.click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(loginUrl);
  const heading = page.getByRole('heading', { level: 2 });
  await expect(heading).toHaveText('Welcome to login');

  await context.close();
});
