import { expect, type Page } from '@playwright/test';
import { baseUrl } from './constants';

export const CGU_ACCEPTANCE_PATH = '/acceptation-cgu';

/** Login lands on the home page, or on the CGU page while the CGU in force are not accepted. */
export const isLoginLandingUrl = (url: URL) =>
  url.origin === new URL(baseUrl).origin && ['/home', CGU_ACCEPTANCE_PATH].includes(url.pathname);

/**
 * Until the CGU in force are accepted, the application leads to the CGU page and its modal. Seeded users
 * (local target) have already accepted them; on the integration target the test user accepts them there.
 */
export async function acceptCguIfAsked(page: Page): Promise<void> {
  const requestsHeading = page.getByRole('heading', { name: 'Liste des requêtes', level: 1 });
  const acceptCguButton = page
    .getByRole('dialog', { name: 'Conditions générales d’utilisation de SIRENA' })
    .getByRole('button', { name: 'Accepter', exact: true });

  await expect(requestsHeading.or(acceptCguButton)).toBeVisible({ timeout: 30000 });
  if (await acceptCguButton.isVisible()) {
    await acceptCguButton.click();
  }
}
