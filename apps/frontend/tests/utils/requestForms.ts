import { randomUUID } from 'node:crypto';
import { expect, type Locator, type Page } from '@playwright/test';
import { baseUrl } from './constants';

/**
 * Helpers shared by the request form specs (déclarant, personne concernée, situation).
 *
 * Every scenario creates its own request, tagged with a unique value.
 */

export type RequestFormPrefix = 'declarant' | 'personne-concernee' | 'situation';
export type RequestSectionTestId = `${RequestFormPrefix}-section`;

export const e2eTag = (): string => `E2E-${randomUUID().slice(0, 8)}`;

export async function openNewRequest(page: Page): Promise<void> {
  await page.goto(`${baseUrl}/request/create`);
  await expect(page.getByTestId('request-title')).toHaveText('Nouvelle requête');
}

export async function openRequest(page: Page, requestId: string): Promise<void> {
  await page.goto(`${baseUrl}/request/${requestId}`);
  await expect(page.getByTestId('request-title')).toHaveText(`Requête ${requestId}`);
}

/** Follows the edit link ("Compléter" / "Modifier") of a detail page block. */
export async function openSectionForm(page: Page, section: RequestSectionTestId, index = 0): Promise<void> {
  await page.getByTestId(`${section}-edit`).nth(index).click();
}

/** Expands the details accordion of a detail page block. */
export async function expandSectionDetails(page: Page, section: RequestSectionTestId, index = 0): Promise<void> {
  const toggle = page.getByTestId(`${section}-details`).nth(index).getByRole('button');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

export async function expectDisplayed(locator: Locator, text: string | RegExp): Promise<void> {
  await expect(locator).toContainText(text, { useInnerText: true, ignoreCase: true });
}

export async function expectNotDisplayed(locator: Locator, text: string | RegExp): Promise<void> {
  await expect(locator).not.toContainText(text, { useInnerText: true, ignoreCase: true });
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function expectFieldError(field: Locator, message: string): Promise<void> {
  await expect(field).toHaveAccessibleDescription(new RegExp(escapeRegExp(message)));
}

export async function expectNoFieldError(field: Locator, message: string): Promise<void> {
  await expect(field).not.toHaveAccessibleDescription(new RegExp(escapeRegExp(message)));
}

export async function saveForm(page: Page, form: RequestFormPrefix): Promise<void> {
  await page.getByTestId(`${form}-save`).click();
}

const isRequestDetailPath = (pathname: string) => /^\/request\/(?!create$)[^/]+$/.test(pathname);

/** Waits for the redirection to the detail page of the saved request and returns its id. */
export async function expectRedirectToRequest(page: Page): Promise<string> {
  await page.waitForURL((url) => isRequestDetailPath(url.pathname), { timeout: 15000 });
  const requestId = new URL(page.url()).pathname.split('/').pop() as string;
  await expect(page.getByTestId('request-title')).toHaveText(`Requête ${requestId}`);
  return requestId;
}

/** DSFR visually hides native radios and checkboxes behind their label: click the label. */
async function clickDsfrLabel(page: Page, input: Locator): Promise<void> {
  const inputId = await input.getAttribute('id');
  await page.locator(`label[for="${inputId}"]`).click();
}

export async function checkCheckbox(page: Page, testId: string): Promise<void> {
  const checkbox = page.getByTestId(testId);
  await clickDsfrLabel(page, checkbox);
  await expect(checkbox).toBeChecked();
}

export async function checkRadio(page: Page, groupTestId: string, value: string): Promise<void> {
  const radio = page.getByTestId(groupTestId).locator(`input[type="radio"][value="${value}"]`);
  await clickDsfrLabel(page, radio);
  await expect(radio).toBeChecked();
}

export async function fillDomicileManually(
  page: Page,
  { adresse, codePostal, ville }: { adresse: string; codePostal: string; ville: string },
): Promise<void> {
  await checkCheckbox(page, 'domicile-manual-toggle');
  await page.getByTestId('domicile-adresse').fill(adresse);
  await page.getByTestId('domicile-code-postal').fill(codePostal);
  await page.getByTestId('domicile-ville').fill(ville);
}

export const INVALID_PHONE_MESSAGE =
  'Le numéro de téléphone doit être au format national ou international (+33XXXXXXXXXX)';
export const INVALID_EMAIL_MESSAGE =
  'L’adresse e-mail est invalide. Merci de saisir une adresse au format prenom.nom@exemple.com.';
