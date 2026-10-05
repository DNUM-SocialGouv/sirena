import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import { baseUrl } from './utils/constants';
import { expectToast, frenchDate, gotoProcessing, openEditStep, statutGroup, stepItem } from './utils/processingPage';
import { closeRequete, createRequete, type DedicatedRequete } from './utils/requeteApi';

const AR_STEP = "Envoi de l'accusé de réception";

/**
 * Manual acknowledgment of receipt on dedicated manual requests. On the
 * integration target the e-mail goes to a disposable yopmail address.
 */
test.describe('Traitement : accusé de réception', () => {
  let context: BrowserContext;
  let page: Page;
  let withEmail: DedicatedRequete;
  let withoutEmail: DedicatedRequete;

  const arDrawer = () =>
    page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: "Envoyer l'accusé de réception" }) });

  test.beforeAll(async ({ browser }) => {
    const authFile = await ensureAuthenticationFileExists(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
    context = await browser.newContext({ storageState: authFile });
    await autoCloseAnnouncements(context);
    page = await context.newPage();
    withEmail = await createRequete(context.request);
    withoutEmail = await createRequete(context.request, { declarantEmail: null });
  });

  test.afterAll(async () => {
    try {
      for (const requete of [withEmail, withoutEmail]) {
        if (requete) await closeRequete(context.request, requete.id);
      }
    } finally {
      await context?.close();
    }
  });

  test("20. envoie l'accusé avec un commentaire, puis seules les notes restent modifiables", async () => {
    await gotoProcessing(page, withEmail.id);
    const arStep = stepItem(page, AR_STEP);
    await expect(arStep.getByText('À faire', { exact: true })).toBeVisible();
    await arStep.getByRole('button', { name: 'Envoyer', exact: true }).click();

    const drawer = arDrawer();
    await expect(drawer.getByText(withEmail.declarantEmail as string)).toBeVisible();
    await expect(drawer.getByText('Message automatique envoyé au déclarant')).toBeVisible();
    await drawer
      .getByRole('textbox', { name: /^Commentaire personnalisé \(facultatif\)/ })
      .fill('Commentaire personnalisé e2e.');
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/send-acknowledgment')),
      drawer.getByRole('button', { name: "Envoyer l'accusé" }).click(),
    ]);
    // A local backend usually runs with TIPIMAIL_DISABLE_SENDING, which answers 503.
    test.skip(
      response.status() === 503,
      "L'envoi des e-mails est désactivé sur cette cible (TIPIMAIL_DISABLE_SENDING).",
    );
    await expectToast(page, 'Accusé de réception envoyé avec succès');
    await expect(drawer).toBeHidden();

    await expect(arStep.getByText('À faire', { exact: true })).toHaveCount(0);
    await expect(arStep.getByText(new RegExp(`^Envoyé le ${frenchDate()}`))).toBeVisible();
    await expect(arStep.getByRole('button', { name: 'Envoyer', exact: true })).toHaveCount(0);

    const editDrawer = await openEditStep(page, AR_STEP);
    await expect(editDrawer.getByText(/Cette étape correspond à un accusé de réception/)).toBeVisible();
    await expect(editDrawer.getByRole('textbox', { name: "Nom de l'étape (obligatoire)" })).toHaveCount(0);
    await expect(editDrawer.getByText('Ce champ est en lecture seule.')).toBeVisible();
    await expect(statutGroup(editDrawer).getByRole('radio', { name: 'Fait', exact: true })).toBeDisabled();
    await expect(editDrawer.getByRole('button', { name: "Supprimer l'étape" })).toHaveCount(0);
    await expect(editDrawer.getByRole('button', { name: 'Ajouter une note' })).toBeEnabled();
    await editDrawer.getByRole('button', { name: 'Annuler', exact: true }).click();
  });

  test('21. sans e-mail du déclarant, invite à le renseigner depuis ses informations', async () => {
    await gotoProcessing(page, withoutEmail.id);
    await stepItem(page, AR_STEP).getByRole('button', { name: 'Envoyer', exact: true }).click();

    const drawer = arDrawer();
    await expect(drawer.getByText(/Renseignez l'adresse électronique dans les/)).toBeVisible();
    await drawer.getByRole('link', { name: 'informations du déclarant' }).click();
    await expect(page).toHaveURL(`${baseUrl}/request/${withoutEmail.id}/declarant`);
  });
});
