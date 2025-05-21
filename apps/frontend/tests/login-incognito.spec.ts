import { expect, test } from '@playwright/test';
import { loginUrl, password, user } from './utils';
const BASE_URL = 'http://localhost:5173';

test('login', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(loginUrl);
  // first time going on login Url should not redirect
  await expect(page).toHaveURL(loginUrl);

  await page.getByRole('link', { name: 'S’identifier avec ProConnect' }).click();
  const userInput = page.getByRole('textbox', { name: 'Email professionnel Format' });
  await userInput.fill(user);
  const loginButton = page.getByTestId('interaction-connection-button');
  loginButton.click();
  await expect(page).toHaveURL('https://identite-sandbox.proconnect.gouv.fr/users/sign-in');
  const passwordInput = page.getByRole('textbox', { name: 'Renseignez votre mot de passe' });
  await passwordInput.fill(password);
  const logButton = page.getByRole('button', { name: 'S’identifier' });
  logButton.click();
  // fix e2e testing by waiting the wright redirect page
  await expect(page).toHaveURL('https://identite-sandbox.proconnect.gouv.fr/users/select-organization');
  const locationSelector = page.getByRole('button', { name: 'Commune de gap - Mairie (' });
  locationSelector.click();
  await expect(page).toHaveURL(`${BASE_URL}/home`);
  expect(page).not.toHaveTitle('Login');
  await page.goto(loginUrl);
  await expect(page).toHaveURL(`${BASE_URL}/home`);
  await context.close();
});
