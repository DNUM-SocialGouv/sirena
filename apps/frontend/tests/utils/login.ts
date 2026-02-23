import { expect, type Page } from '@playwright/test';
import { baseUrl, loginUrl } from './constants';

type LoginWithProconnectParams = {
  password: string;
  user: string;
  organisation?: string;
};

// Simple rate limiter to avoid AgentConnect issues with concurrent sessions
let lastLoginTime = 0;
const MIN_LOGIN_INTERVAL = 1000; // 1 second

const waitForRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastLogin = now - lastLoginTime;

  if (timeSinceLastLogin < MIN_LOGIN_INTERVAL) {
    const waitTime = MIN_LOGIN_INTERVAL - timeSinceLastLogin;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastLoginTime = Date.now();
};

export const loginWithProconnect = async (
  page: Page,
  { password, user, organisation = 'Commune de clamart - Mairie' }: LoginWithProconnectParams,
) => {
  await waitForRateLimit();

  await page.goto(loginUrl);

  const loginLink = page.locator('button.pro-connect');
  await loginLink.waitFor({ state: 'visible', timeout: 15000 });
  await loginLink.click();

  const userInput = page.getByRole('textbox', { name: 'Email professionnel Format' });
  await userInput.waitFor({ state: 'visible', timeout: 15000 });
  await userInput.fill(user);
  const loginButton = page.getByRole('button', { name: 'Continuer', exact: true });
  await loginButton.click();

  const passwordInput = page.getByRole('textbox', { name: 'Renseignez votre mot de passe' });
  await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
  await passwordInput.fill(password);
  const logButton = page.getByRole('button', { name: /S.identifier/i });
  await logButton.click();

  const locationSelector = page.locator(`[role="button"][aria-label*="${organisation}"]`).first();
  await locationSelector.waitFor({ state: 'visible', timeout: 15000 });
  await locationSelector.click();

  await expect(page).toHaveURL(`${baseUrl}/home`, { timeout: 30000 });
};
