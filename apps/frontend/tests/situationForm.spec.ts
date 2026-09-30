import { type BrowserContext, expect, type Locator, type Page, test } from '@playwright/test';
import { LIEU_DOMICILE_PRECISION, LIEU_TYPE, MIS_EN_CAUSE_TYPE } from '@sirena/common/constants';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';
import {
  e2eTag,
  expandSectionDetails,
  expectDisplayed,
  expectFieldError,
  expectNotDisplayed,
  expectRedirectToRequest,
  openNewRequest,
  openSectionForm,
  saveForm,
} from './utils/requestForms';

/**
 * Situation form E2E TESTS
 *
 * Prerequisites:
 * - User has ENTITY_ADMIN role (can create requests)
 * - User belongs to an entity: it prefills the mandatory "Traitement des faits" entity
 *
 * Each test creates its own request, tagged with a unique "E2E-xxxxxxxx" description.
 */

const MISSING_ENTITE_MESSAGE = 'Au moins une entité administrative doit être renseignée.';
const INVALID_DATE_DEBUT_MESSAGE = 'Le champ “Date de début des faits” n’est pas valide. Format attendu : JJ/MM/AAAA';

const entiteCombobox = (page: Page): Locator => page.getByTestId('traitement-des-faits').getByRole('combobox');

async function expectSituationFormTitle(page: Page): Promise<void> {
  await expect(page.getByTestId('situation-form-title')).toHaveText('Description de la situation');
}

/** New situation: the user's entity is prefilled once the profile and entities are loaded. */
async function expectPrefilledEntite(page: Page): Promise<string> {
  await expect(entiteCombobox(page)).not.toHaveValue('');
  return entiteCombobox(page).inputValue();
}

async function openNewSituationForm(page: Page): Promise<string> {
  await openNewRequest(page);
  await openSectionForm(page, 'situation-section');
  await expect(page).toHaveURL(`${baseUrl}/request/create/situation`);
  await expectSituationFormTitle(page);
  return expectPrefilledEntite(page);
}

async function createRequestWithSituation(page: Page, explication: string): Promise<string> {
  await openNewSituationForm(page);
  await page.getByTestId('situation-explication-faits').fill(explication);
  await saveForm(page, 'situation');
  return expectRedirectToRequest(page);
}

test.describe('Situation form', () => {
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

  test('should create a request from a situation', async () => {
    const explication = e2eTag();
    const entiteName = await openNewSituationForm(page);

    await page.getByTestId('situation-lieu-type').selectOption(LIEU_TYPE.DOMICILE);
    await page.getByTestId('situation-lieu-domicile-precision').selectOption(LIEU_DOMICILE_PRECISION.CHEZ_TIERS);
    await page.getByTestId('situation-mis-en-cause-type').selectOption(MIS_EN_CAUSE_TYPE.MEMBRE_FAMILLE);
    await page.getByTestId('situation-date-debut').fill('2026-03-01');
    await page.getByTestId('situation-date-fin').fill('2026-03-15');
    await page.getByTestId('situation-explication-faits').fill(explication);

    await saveForm(page, 'situation');
    await expectRedirectToRequest(page);

    const section = page.getByTestId('situation-section');
    await expectDisplayed(section, 'Domicile - Chez un tiers');
    await expectDisplayed(section, 'Membre de la famille');
    await expectDisplayed(section, entiteName);

    await expandSectionDetails(page, 'situation-section');
    await expectDisplayed(section, explication);
    await expectDisplayed(section, 'Du 01/03/2026 au 15/03/2026');
  });

  test('should add a second situation to an existing request', async () => {
    const requestId = await createRequestWithSituation(page, e2eTag());
    await expect(page.getByTestId('situation-section')).toHaveCount(1);

    await page.getByTestId('add-situation-link').click();
    await expect(page).toHaveURL(`${baseUrl}/request/${requestId}/situation`);
    await expectSituationFormTitle(page);
    await expectPrefilledEntite(page);
    await page.getByTestId('situation-explication-faits').fill(e2eTag());
    await saveForm(page, 'situation');

    await expect(page).toHaveURL(`${baseUrl}/request/${requestId}`);
    await expect(page.getByTestId('situation-section')).toHaveCount(2);
  });

  test('should prefill and update an existing situation', async () => {
    const explication = e2eTag();
    const requestId = await createRequestWithSituation(page, explication);

    await openSectionForm(page, 'situation-section');
    await expect(page).toHaveURL(new RegExp(`/request/${requestId}/situation/[^/]+$`));
    await expectSituationFormTitle(page);
    const explicationInput = page.getByTestId('situation-explication-faits');
    await expect(explicationInput).toHaveValue(explication);

    const updatedExplication = e2eTag();
    await explicationInput.fill(updatedExplication);
    await saveForm(page, 'situation');
    await expect(page).toHaveURL(`${baseUrl}/request/${requestId}`);

    await page.reload();
    const section = page.getByTestId('situation-section');
    await expandSectionDetails(page, 'situation-section');
    await expectDisplayed(section, updatedExplication);
    await expectNotDisplayed(section, explication);
  });

  test('should require at least one administrative entity', async () => {
    await openNewSituationForm(page);
    await page.getByTestId('situation-explication-faits').fill(e2eTag());

    // Replace the prefilled entity with an empty row
    await page.getByTestId('traitement-des-faits-add-entite').click();
    await page.getByTestId('traitement-des-faits-remove-entite').first().click();
    await expect(entiteCombobox(page)).toHaveValue('');

    await saveForm(page, 'situation');

    await expectFieldError(page.getByTestId('traitement-des-faits').getByRole('group'), MISSING_ENTITE_MESSAGE);
    await expect(entiteCombobox(page)).toBeFocused();
    await expect(page).toHaveURL(`${baseUrl}/request/create/situation`);
  });

  test('should block the save on an invalid start date', async () => {
    await openNewSituationForm(page);
    const dateDebut = page.getByTestId('situation-date-debut');
    await page.getByTestId('situation-explication-faits').fill(e2eTag());

    // A partially typed date leaves the native date input in an invalid state
    await dateDebut.pressSequentially('03');

    await saveForm(page, 'situation');

    await expectFieldError(dateDebut, INVALID_DATE_DEBUT_MESSAGE);
    await expect(dateDebut).toBeFocused();
    await expect(page).toHaveURL(`${baseUrl}/request/create/situation`);
  });
});
