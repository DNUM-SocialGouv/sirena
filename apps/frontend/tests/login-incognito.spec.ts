import { expect, test } from '@playwright/test';
import { baseUrl, loginUrl, password, user } from './utils/constants';
import { loginWithProconnect } from './utils/login';

test('login', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginWithProconnect(page, { password, user, organisation: 'Commune de gap - Mairie' });

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(`${baseUrl}/home`);
  await expect(page.locator('h2')).toHaveText('Welcome to home');
  await expect(page.locator('h2')).not.toHaveText('Welcome to login');
  await page.goto(loginUrl);
  await expect(page).toHaveURL(`${baseUrl}/home`);
  await context.close();
});
