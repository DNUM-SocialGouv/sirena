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
  { password, user, organisation = 'Ville de paris - Mairie' }: LoginWithProconnectParams,
) => {
  await waitForRateLimit();

  await page.goto(loginUrl);
  await page.waitForLoadState('networkidle');

  const loginLink = page.getByRole('button', { name: 'S’identifier avec ProConnect' });
  await loginLink.waitFor({ state: 'visible' });
  await loginLink.click();

  await page.waitForLoadState('networkidle');
  const userInput = page.getByRole('textbox', { name: 'Email professionnel Format' });
  await userInput.fill(user);
  const loginButton = page.getByRole('button', { name: 'Continuer', exact: true });
  loginButton.click();

  await page.waitForLoadState('networkidle');
  const passwordInput = page.getByRole('textbox', { name: 'Renseignez votre mot de passe' });
  await passwordInput.fill(password);
  const logButton = page.getByRole('button', { name: 'S’identifier' });
  logButton.click();

  await page.waitForLoadState('networkidle');

  let locationSelector = page.locator(`[role="button"][aria-label*="${organisation}"]`).first();

  const count = await locationSelector.count();
  if (count === 0) {
    locationSelector = page.locator('[role="button"][aria-label*="(choisir cette organisation)"]').first();
  }

  locationSelector.click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(`${baseUrl}/home`);
};
