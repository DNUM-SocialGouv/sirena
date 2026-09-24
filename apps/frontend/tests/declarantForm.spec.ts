import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { mappers } from '@sirena/common';
import { CIVILITE, LIEN_VICTIME, REPONSE_OUI_NON } from '@sirena/common/constants';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';
import {
  checkCheckbox,
  checkRadio,
  e2eTag,
  expandSectionDetails,
  expectDisplayed,
  expectFieldError,
  expectNoFieldError,
  expectRedirectToRequest,
  fillDomicileManually,
  INVALID_EMAIL_MESSAGE,
  INVALID_PHONE_MESSAGE,
  openNewRequest,
  openRequest,
  openSectionForm,
  saveForm,
} from './utils/requestForms';

/**
 * Déclarant form E2E TESTS
 *
 * Prerequisites:
 * - User has ENTITY_ADMIN role (can create requests)
 *
 * Each test creates its own request, tagged with a unique "E2E-xxxxxxxx" name.
 */

async function openNewDeclarantForm(page: Page): Promise<void> {
  await openNewRequest(page);
  await openSectionForm(page, 'declarant-section');
  await expect(page).toHaveURL(`${baseUrl}/request/create/declarant`);
  await expect(page.getByTestId('declarant-form-title')).toHaveText('Déclarant');
}

async function createRequestWithDeclarant(page: Page, nom: string): Promise<string> {
  await openNewDeclarantForm(page);
  await page.getByTestId('declarant-nom').fill(nom);
  await saveForm(page, 'declarant');
  return expectRedirectToRequest(page);
}

test.describe('Déclarant form', () => {
  let context: BrowserContext;
  let page: Page;
  let authFile: string;

  test.beforeAll(async ({ browser }) => {
    authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
  });

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: authFile });
    await autoCloseAnnouncements(context);
    page = await context.newPage();
  });

  test.afterEach(async () => {
    if (context) {
      await context.close();
    }
  });

  test('should create a request from a fully filled declarant', async () => {
    const nom = e2eTag();
    await openNewDeclarantForm(page);

    await page.getByTestId('declarant-civilite').selectOption(mappers.CIVILITE_MAPPING.DB_TO_FRONTEND[CIVILITE.MME]);
    await page.getByTestId('declarant-nom').fill(nom);
    await page.getByTestId('declarant-prenom').fill('Camille');
    await page.getByTestId('declarant-lien-personne-concernee').selectOption(LIEN_VICTIME.AUTRE);
    await page.getByTestId('declarant-lien-precision').fill('Voisine de palier');
    await checkCheckbox(page, 'declarant-is-tuteur');
    await fillDomicileManually(page, { adresse: '10 rue de la Paix', codePostal: '75002', ville: 'Paris' });
    await page.getByTestId('declarant-telephone').fill('0601020304');
    await page.getByTestId('declarant-email').fill('camille.e2e@example.com');
    await checkRadio(page, 'declarant-consent-identite', REPONSE_OUI_NON.OUI);
    await page.getByTestId('declarant-autres-precisions').fill(`Précisions ${nom}`);

    await saveForm(page, 'declarant');
    await expectRedirectToRequest(page);

    const section = page.getByTestId('declarant-section');
    await expectDisplayed(section, nom);
    await expectDisplayed(section, 'camille.e2e@example.com');
    await expectDisplayed(section, '0601020304');

    await expandSectionDetails(page, 'declarant-section');
    await expectDisplayed(section, 'Voisine de palier');
    await expectDisplayed(section, '10 rue de la Paix 75002 Paris');
    await expectDisplayed(section, 'Le déclarant est curateur ou tuteur de la personne concernée');
    await expectDisplayed(section, `Précisions ${nom}`);
  });

  test('should prefill and update an existing declarant', async () => {
    const nom = e2eTag();
    const requestId = await createRequestWithDeclarant(page, nom);

    await openSectionForm(page, 'declarant-section');
    await expect(page).toHaveURL(`${baseUrl}/request/${requestId}/declarant`);
    await expect(page.getByTestId('declarant-nom')).toHaveValue(nom);

    await page.getByTestId('declarant-telephone').fill('0709080706');
    await saveForm(page, 'declarant');
    await expect(page).toHaveURL(`${baseUrl}/request/${requestId}`);

    await openRequest(page, requestId);
    const section = page.getByTestId('declarant-section');
    await expectDisplayed(section, nom);
    await expectDisplayed(section, '0709080706');
  });

  test('should block the save on invalid phone and email, then accept corrected values', async () => {
    await openNewDeclarantForm(page);
    const telephone = page.getByTestId('declarant-telephone');
    const email = page.getByTestId('declarant-email');
    await page.getByTestId('declarant-nom').fill(e2eTag());
    await telephone.fill('12345');
    await email.fill('adresse-invalide');

    await saveForm(page, 'declarant');

    await expectFieldError(telephone, INVALID_PHONE_MESSAGE);
    await expectFieldError(email, INVALID_EMAIL_MESSAGE);
    // Focus goes to the first field in error, following DOM order
    await expect(telephone).toBeFocused();
    await expect(page).toHaveURL(`${baseUrl}/request/create/declarant`);

    // Once a save was attempted, errors are re-validated on input
    await telephone.fill('+33601020304');
    await expectNoFieldError(telephone, INVALID_PHONE_MESSAGE);
    await email.fill('valide.e2e@example.com');
    await expectNoFieldError(email, INVALID_EMAIL_MESSAGE);

    await saveForm(page, 'declarant');
    await expectRedirectToRequest(page);
    await expectDisplayed(page.getByTestId('declarant-section'), '+33601020304');
  });

  test('should record that the declarant is the personne concernée', async () => {
    await openNewDeclarantForm(page);

    await checkCheckbox(page, 'declarant-est-personne-concernee');
    await expect(page.getByTestId('declarant-personne-concernee-callout')).toContainText(
      'Enregistrez puis complétez la section "Personne concernée".',
    );
    await expect(page.getByTestId('declarant-nom')).toBeHidden();

    await saveForm(page, 'declarant');
    await expectRedirectToRequest(page);
    await expectDisplayed(
      page.getByTestId('declarant-section'),
      'Le déclarant est la personne concernée par la requête.',
    );
  });

  test('should warn that declarant data will be erased when checking "personne concernée"', async () => {
    await openNewDeclarantForm(page);
    await page.getByTestId('declarant-nom').fill(e2eTag());

    await checkCheckbox(page, 'declarant-est-personne-concernee');

    await expect(page.getByTestId('declarant-personne-concernee-warning')).toContainText(
      'les données renseignées dans la section "Déclarant" seront effacées',
    );
  });

  test('should not create a request when saving an empty declarant', async () => {
    await openNewDeclarantForm(page);

    await saveForm(page, 'declarant');

    await expect(page).toHaveURL(`${baseUrl}/request/create`);
    await expect(page.getByTestId('request-title')).toHaveText('Nouvelle requête');
  });
});
