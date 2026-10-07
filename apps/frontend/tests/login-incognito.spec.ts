import { expect, test } from '@playwright/test';
import { baseUrl, ENTITY_ADMIN_USER, isLocalTarget, loginUrl } from './utils/constants';
import { loginWithProconnect } from './utils/login';

test('login', async ({ browser }) => {
  test.skip(isLocalTarget, 'ProConnect flow is not exercised in local target.');
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginWithProconnect(page, {
    password: ENTITY_ADMIN_USER.password,
    user: ENTITY_ADMIN_USER.user,
    organisation: 'Commune de clamart - Mairie',
  });

  await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 30000 });
  await expect(page.getByTestId('home-title')).toBeVisible({ timeout: 10000 });
  await page.goto(loginUrl);
  await expect(page).toHaveURL(`${baseUrl}/home`);
  await context.close();
});
