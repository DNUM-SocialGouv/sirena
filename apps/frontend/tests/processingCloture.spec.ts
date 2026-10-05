import { type BrowserContext, expect, type Locator, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import {
  expectToast,
  FIXTURES,
  fileInput,
  fileLink,
  fixtureName,
  frenchDate,
  gotoProcessing,
  isoDate,
  stepItem,
} from './utils/processingPage';
import { closeRequete, createRequete, getRequeteStatut } from './utils/requeteApi';

const CLOTURE_REASON = 'Sans suite après évaluation';
const READ_ONLY_CLOSED_ALERT = 'Accès en lecture seule : cette requête est clôturée et ne peut plus être modifiée.';

/**
 * Closing and reopening a request. The tests run in order on one dedicated
 * request: they walk through its lifecycle (open → closed → reopened).
 */
test.describe('Traitement : clôture et réouverture', () => {
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;
  let requeteId: string;
  const precision = `Précisions de clôture e2e ${Date.now()}`;

  const closeModal = () => page.getByRole('dialog', { name: 'Clôturer la requête' });
  const reasonsButton = (modal: Locator) => modal.locator('button[aria-haspopup="listbox"]');

  async function openCloseModal(): Promise<Locator> {
    await page.getByRole('button', { name: 'Clôturer', exact: true }).click();
    const modal = closeModal();
    await expect(modal).toBeVisible();
    return modal;
  }

  async function selectReason(modal: Locator): Promise<void> {
    await reasonsButton(modal).click();
    await page.getByRole('option', { name: CLOTURE_REASON }).click();
    await page.keyboard.press('Escape');
    await expect(reasonsButton(modal)).toContainText(CLOTURE_REASON);
  }

  test.beforeAll(async ({ browser }) => {
    const authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
    context = await browser.newContext({ storageState: authFile });
    await autoCloseAnnouncements(context);
    page = await context.newPage();
    ({ id: requeteId } = await createRequete(context.request));
  });

  test.beforeEach(async () => {
    await gotoProcessing(page, requeteId);
  });

  test.afterAll(async () => {
    try {
      if (requeteId) await closeRequete(context.request, requeteId);
    } finally {
      await context?.close();
    }
  });

  test('26. la clôture exige une raison et une date passée, les précisions sont limitées à 5 000 caractères', async () => {
    const modal = await openCloseModal();
    const submit = modal.getByRole('button', { name: 'Clôturer la requête' });
    const dateInput = modal.getByLabel('Date de clôture');

    await expect(dateInput).toHaveValue(isoDate());
    await submit.click();
    await expect(
      modal.getByText('Vous devez renseigner au moins une raison de clôture pour clôturer la requête.', {
        exact: false,
      }),
    ).toBeVisible();

    await selectReason(modal);
    await dateInput.fill('');
    await submit.click();
    await expect(modal.getByText('Vous devez renseigner une date de clôture pour clôturer la requête.')).toBeVisible();

    await dateInput.fill(isoDate(1));
    await submit.click();
    await expect(modal.getByText('La date de clôture ne peut pas être dans le futur.')).toBeVisible();

    // The field caps the input at 5 000 characters.
    const precisionField = modal.getByRole('textbox', { name: /^Précisions \(facultatif\)/ });
    await precisionField.fill('x'.repeat(5001));
    await expect(precisionField).toHaveValue('x'.repeat(5000));
    await expect(modal.getByText('5000/5000 caractères maximum')).toBeVisible();

    await modal.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(modal).toBeHidden();
    expect(await getRequeteStatut(context.request, requeteId)).not.toBe('CLOTUREE');
  });

  test('27. clôture la requête avec raison, date, précisions et pièce jointe', async () => {
    const modal = await openCloseModal();
    await selectReason(modal);
    await modal.getByLabel('Date de clôture').fill(isoDate(-1));
    await modal.getByRole('textbox', { name: /^Précisions \(facultatif\)/ }).fill(precision);
    await fileInput(modal).setInputFiles(FIXTURES.pdf);
    await modal.getByRole('button', { name: 'Clôturer la requête' }).click();
    await expect(modal).toBeHidden({ timeout: 15000 });

    const cloture = stepItem(page, 'Clôture');
    await expect(cloture).toBeVisible();
    await expect(cloture.getByText(`Requête clôturée le ${frenchDate(-1)}`)).toBeVisible();
    await expect(cloture.getByText(CLOTURE_REASON)).toBeVisible();
    await expect(cloture.getByText(precision)).toBeVisible();
    await expect(fileLink(cloture, fixtureName(FIXTURES.pdf))).toBeVisible();
    expect(await getRequeteStatut(context.request, requeteId)).toBe('CLOTUREE');
  });

  test('28. une requête clôturée passe en lecture seule', async () => {
    await expect(page.getByText(READ_ONLY_CLOSED_ALERT)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter une étape' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clôturer', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: "Modifier l'étape" })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Rouvrir', exact: true })).toBeVisible();
  });

  test("29. ajoute une pièce jointe à l'étape de clôture", async () => {
    const cloture = stepItem(page, 'Clôture');
    await cloture.getByRole('button', { name: 'Ajouter un fichier' }).click();
    const drawer = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Clôture', level: 3 }) });
    const submit = drawer.getByRole('button', { name: 'Ajouter à l’étape' });
    await expect(submit).toBeVisible();

    await submit.click();
    await expect(drawer.getByText('Vous devez sélectionner au moins un fichier.')).toBeVisible();

    await fileInput(drawer).setInputFiles(FIXTURES.image);
    await submit.click();
    await expect(drawer).toBeHidden({ timeout: 15000 });
    await expect(fileLink(cloture, fixtureName(FIXTURES.image))).toBeVisible();
    await expect(fileLink(cloture, fixtureName(FIXTURES.pdf))).toBeVisible();
  });

  test('30. rouvre la requête : étape « Réouverture » non modifiable et édition de nouveau possible', async () => {
    await page.getByRole('button', { name: 'Rouvrir', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Rouvrir la requête' });
    await modal.getByRole('button', { name: 'Rouvrir la requête' }).click();
    await expect(modal).toBeHidden({ timeout: 15000 });

    const reouverture = stepItem(page, 'Réouverture de la requête');
    await expect(reouverture).toBeVisible();
    await expect(reouverture.getByRole('button', { name: "Modifier l'étape" })).toHaveCount(0);
    await expect(page.getByText(READ_ONLY_CLOSED_ALERT)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ajouter une étape' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clôturer', exact: true })).toBeVisible();
    expect(await getRequeteStatut(context.request, requeteId)).toBe('EN_COURS');
  });

  test("14 bis. supprime une pièce jointe de l'étape de clôture depuis la frise", async () => {
    const cloture = stepItem(page, 'Clôture');
    const imageName = fixtureName(FIXTURES.image);
    await cloture.getByRole('button', { name: `Supprimer le fichier ${imageName}` }).click();

    const modal = page.getByRole('dialog', { name: 'Supprimer le fichier' });
    await expect(modal.getByText(`Êtes-vous sûr de vouloir supprimer le fichier "${imageName}"`)).toBeVisible();
    await modal.getByRole('button', { name: 'Confirmer' }).click();
    await expectToast(page, 'Fichier supprimé avec succès');

    await expect(fileLink(cloture, imageName)).toHaveCount(0);
    await page.reload();
    await expect(fileLink(stepItem(page, 'Clôture'), fixtureName(FIXTURES.pdf))).toBeVisible();
    await expect(fileLink(stepItem(page, 'Clôture'), imageName)).toHaveCount(0);
  });
});
