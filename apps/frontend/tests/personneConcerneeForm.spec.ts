import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { mappers } from '@sirena/common';
import { AGE, CIVILITE, MESURE_PROTECTION, REPONSE_OUI_NON } from '@sirena/common/constants';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';
import {
  checkRadio,
  e2eTag,
  expandSectionDetails,
  expectDisplayed,
  expectFieldError,
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
 * Personne concernée form E2E TESTS
 *
 * Prerequisites:
 * - User has ENTITY_ADMIN role (can create requests)
 *
 * Each test creates its own request, tagged with a unique "E2E-xxxxxxxx" name.
 */

const INVALID_DATE_NAISSANCE_MESSAGE = 'Le champ “Date de naissance” n’est pas valide. Format attendu : JJ/MM/AAAA';

async function openNewPersonneConcerneeForm(page: Page): Promise<void> {
  await openNewRequest(page);
  await openSectionForm(page, 'personne-concernee-section');
  await expect(page).toHaveURL(`${baseUrl}/request/create/personne-concernee`);
  await expect(page.getByTestId('personne-concernee-form-title')).toHaveText('Personne concernée');
}

test.describe('Personne concernée form', () => {
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

  test('should create a request from a fully filled personne concernée', async () => {
    const nom = e2eTag();
    await openNewPersonneConcerneeForm(page);

    await page
      .getByTestId('personne-concernee-civilite')
      .selectOption(mappers.CIVILITE_MAPPING.DB_TO_FRONTEND[CIVILITE.M]);
    await page.getByTestId('personne-concernee-nom').fill(nom);
    await page.getByTestId('personne-concernee-prenom').fill('Dominique');
    await page.getByTestId('personne-concernee-age').selectOption(AGE['60-79']);
    await page.getByTestId('personne-concernee-date-naissance').fill('1955-05-17');
    await fillDomicileManually(page, { adresse: '3 place du Marché', codePostal: '69001', ville: 'Lyon' });
    await page.getByTestId('personne-concernee-telephone').fill('0611223344');
    await page.getByTestId('personne-concernee-email').fill('dominique.e2e@example.com');
    await checkRadio(page, 'personne-concernee-est-handicapee', REPONSE_OUI_NON.OUI);
    await checkRadio(page, 'personne-concernee-mesure-protection', MESURE_PROTECTION.MANDATAIRE_FAMILIAL);

    await saveForm(page, 'personne-concernee');
    await expectRedirectToRequest(page);

    // The request header shows the personne concernée identity
    await expectDisplayed(page.getByTestId('request-personne-concernee'), nom);

    const section = page.getByTestId('personne-concernee-section');
    await expectDisplayed(section, 'dominique.e2e@example.com');
    await expectDisplayed(section, '0611223344');

    await expandSectionDetails(page, 'personne-concernee-section');
    await expectDisplayed(section, 'Âge : Entre 60 et 79 ans');
    await expectDisplayed(section, 'Date de naissance : 17/05/1955');
    await expectDisplayed(section, '3 place du Marché 69001 Lyon');
    await expectDisplayed(section, "Il/elle est en situation d'handicap");
    await expectDisplayed(section, 'Il/elle est en mesure de protection : mandataire familial');
  });

  test('should show and save the conditional fields', async () => {
    const nom = e2eTag();
    await openNewPersonneConcerneeForm(page);
    await page.getByTestId('personne-concernee-nom').fill(nom);

    const raisonNonInformee = page.getByTestId('personne-concernee-victime-informee-commentaire');
    const autresPersonnes = page.getByTestId('personne-concernee-autres-personnes-precisions');
    await expect(raisonNonInformee).toBeHidden();
    await expect(autresPersonnes).toBeHidden();

    await checkRadio(page, 'personne-concernee-victime-informee', REPONSE_OUI_NON.NON);
    await raisonNonInformee.fill(`Raison ${nom}`);
    await checkRadio(page, 'personne-concernee-autres-personnes', REPONSE_OUI_NON.OUI);
    await autresPersonnes.fill(`Frère ${nom}`);

    await saveForm(page, 'personne-concernee');
    await expectRedirectToRequest(page);

    const section = page.getByTestId('personne-concernee-section');
    await expandSectionDetails(page, 'personne-concernee-section');
    await expectDisplayed(section, `Raison pour laquelle il/elle n'est pas informé(e) : Raison ${nom}`);
    await expectDisplayed(section, "D'autres personnes sont concernées par la requête : Oui");
    await expectDisplayed(section, `Frère ${nom}`);
  });

  test('should block the save on invalid birth date, phone and email', async () => {
    await openNewPersonneConcerneeForm(page);
    const dateNaissance = page.getByTestId('personne-concernee-date-naissance');
    const telephone = page.getByTestId('personne-concernee-telephone');
    const email = page.getByTestId('personne-concernee-email');
    await page.getByTestId('personne-concernee-nom').fill(e2eTag());

    // A partially typed date leaves the native date input in an invalid state
    await dateNaissance.pressSequentially('12');
    await telephone.fill('06');
    await email.fill('pas-un-email');

    await saveForm(page, 'personne-concernee');

    await expectFieldError(dateNaissance, INVALID_DATE_NAISSANCE_MESSAGE);
    await expectFieldError(telephone, INVALID_PHONE_MESSAGE);
    await expectFieldError(email, INVALID_EMAIL_MESSAGE);
    // Focus goes to the first field in error, following DOM order
    await expect(dateNaissance).toBeFocused();
    await expect(page).toHaveURL(`${baseUrl}/request/create/personne-concernee`);
  });

  test('should prefill and update an existing personne concernée', async () => {
    const nom = e2eTag();
    await openNewPersonneConcerneeForm(page);
    await page.getByTestId('personne-concernee-nom').fill(nom);
    await page.getByTestId('personne-concernee-prenom').fill('Alex');
    await saveForm(page, 'personne-concernee');
    const requestId = await expectRedirectToRequest(page);

    await openSectionForm(page, 'personne-concernee-section');
    await expect(page).toHaveURL(`${baseUrl}/request/${requestId}/personne-concernee`);
    await expect(page.getByTestId('personne-concernee-nom')).toHaveValue(nom);
    await expect(page.getByTestId('personne-concernee-prenom')).toHaveValue('Alex');

    await page.getByTestId('personne-concernee-email').fill('alex.e2e@example.com');
    await saveForm(page, 'personne-concernee');
    await expect(page).toHaveURL(`${baseUrl}/request/${requestId}`);

    await openRequest(page, requestId);
    await expectDisplayed(page.getByTestId('personne-concernee-section'), 'alex.e2e@example.com');
  });
});
