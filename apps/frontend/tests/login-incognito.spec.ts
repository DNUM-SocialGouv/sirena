import { expect, test } from '@playwright/test';
import { baseUrl, ENTITY_ADMIN_USER, loginUrl } from './utils/constants';
import { loginWithProconnect } from './utils/login';

test('login', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginWithProconnect(page, {
    password: ENTITY_ADMIN_USER.password,
    user: ENTITY_ADMIN_USER.user,
    organisation: 'ville de paris',
  });

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(`${baseUrl}/home`);
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(/Bienvenue/);
  await page.goto(loginUrl);
  await expect(page).toHaveURL(`${baseUrl}/home`);
  await context.close();
});
