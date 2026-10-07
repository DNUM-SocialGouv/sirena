import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, ensureAuthenticationFileExists } from './utils/authHelper';
import {
  chooseRadio,
  createStep,
  expectToast,
  FIXTURES,
  faitLeInput,
  fileInput,
  fileLink,
  fixtureName,
  frenchDate,
  gotoProcessing,
  isoDate,
  nomInput,
  openCreateStep,
  openEditStep,
  originalFileHref,
  rappelDateInput,
  rappelSelect,
  saveStep,
  statutGroup,
  stepDrawer,
  stepItem,
} from './utils/processingPage';
import {
  closeRequete,
  createRequete,
  deleteManualSteps,
  downloadStepFile,
  getProcessingSteps,
} from './utils/requeteApi';

/**
 * Processing steps lifecycle (creation, edition, deletion, attachments, rappels)
 * on a dedicated request created for this file and closed afterwards.
 */
test.describe('Traitement : étapes', () => {
  let context: BrowserContext;
  let page: Page;
  let requeteId: string;

  const uniqueName = (label: string) => `e2e ${label} ${randomUUID().slice(0, 8)}`;

  const stepCount = async () => (await getProcessingSteps(context.request, requeteId)).length;

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

  test.afterEach(async () => {
    await deleteManualSteps(context.request, requeteId);
  });

  test.afterAll(async () => {
    try {
      if (requeteId) await closeRequete(context.request, requeteId);
    } finally {
      await context?.close();
    }
  });

  test.describe('A. Création', () => {
    test('1. crée une étape « À faire » qui persiste après rechargement', async () => {
      const nom = uniqueName('à faire');
      const step = await createStep(page, nom, { statut: 'À faire' });
      await expectToast(page, 'Étape ajoutée');
      await expect(step.getByText('À faire', { exact: true })).toBeVisible();

      await page.reload();
      await expect(stepItem(page, nom)).toBeVisible();
      await expect(stepItem(page, nom).getByText('À faire', { exact: true })).toBeVisible();
    });

    test('2. crée une étape « Fait » et affiche sa date de réalisation', async () => {
      const nom = uniqueName('fait');
      const step = await createStep(page, nom, { statut: 'Fait', faitLe: isoDate(-2) });
      await expect(step.getByText(`Fait le ${frenchDate(-2)}`)).toBeVisible();
      await expect(step.getByText('À faire', { exact: true })).toHaveCount(0);
    });

    test("3. bloque l'enregistrement tant que le formulaire est invalide", async () => {
      const before = await stepCount();
      const drawer = await openCreateStep(page);

      await saveStep(drawer);
      await expect(
        drawer.getByText("Le champ 'Nom de l'étape' est obligatoire. Veuillez le renseigner pour ajouter une étape."),
      ).toBeVisible();
      await expect(nomInput(drawer)).toBeFocused();

      await nomInput(drawer).fill(uniqueName('invalide'));
      await chooseRadio(statutGroup(drawer), 'Fait');
      await faitLeInput(drawer).fill('');
      await saveStep(drawer);
      await expect(
        drawer.getByText("La date de réalisation est obligatoire lorsque le statut de l'étape est « Fait »."),
      ).toBeVisible();

      // A partially typed date is not a valid date for the browser.
      await faitLeInput(drawer).click();
      await page.keyboard.type('12');
      await saveStep(drawer);
      await expect(
        drawer.getByText(/Le champ « Fait le » est incomplet ou contient une date non valide/),
      ).toBeVisible();

      await chooseRadio(statutGroup(drawer), 'À faire');
      await drawer.getByRole('textbox', { name: /^Ajouter une note/ }).fill('x'.repeat(10_001));
      await saveStep(drawer);
      await expect(drawer.getByText(/ne doit pas dépasser 10 000 caractères/)).toBeVisible();

      await expect(drawer).toBeVisible();
      expect(await stepCount()).toBe(before);
      await drawer.getByRole('button', { name: 'Annuler', exact: true }).click();
    });

    test('4. crée une étape avec une note et une pièce jointe', async () => {
      const nom = uniqueName('note et PJ');
      const note = `Note e2e ${randomUUID()}`;
      const step = await createStep(page, nom, { statut: 'À faire', note, files: [FIXTURES.pdf] });
      await expect(step.getByText(note)).toBeVisible();
      await expect(fileLink(step, fixtureName(FIXTURES.pdf))).toBeVisible();
    });

    test('5. « Annuler » ferme le panneau sans rien créer', async () => {
      const before = await stepCount();
      const nom = uniqueName('annulée');
      const drawer = await openCreateStep(page);
      await nomInput(drawer).fill(nom);
      await drawer.getByRole('button', { name: 'Annuler', exact: true }).click();

      await expect(drawer).toBeHidden();
      await expect(stepItem(page, nom)).toHaveCount(0);
      expect(await stepCount()).toBe(before);
    });
  });

  test.describe('B. Modification', () => {
    test("6. renomme l'étape et la passe de « À faire » à « Fait »", async () => {
      const nom = uniqueName('à renommer');
      const renamed = uniqueName('renommée');
      await createStep(page, nom, { statut: 'À faire' });

      const drawer = await openEditStep(page, nom);
      await nomInput(drawer).fill(renamed);
      await chooseRadio(statutGroup(drawer), 'Fait');
      await faitLeInput(drawer).fill(isoDate(-1));
      await saveStep(drawer);
      await expectToast(page, 'Étape modifiée');

      const step = stepItem(page, renamed);
      await expect(step).toBeVisible();
      await expect(step.getByText(`Fait le ${frenchDate(-1)}`)).toBeVisible();
      await expect(step.getByText('À faire', { exact: true })).toHaveCount(0);
      await expect(stepItem(page, nom)).toHaveCount(0);
    });

    test('7. ajoute des notes et les affiche toutes avec « Afficher les notes précédentes »', async () => {
      const nom = uniqueName('notes');
      const notes = [1, 2, 3, 4].map((index) => `Note ${index} ${randomUUID().slice(0, 8)}`);
      await createStep(page, nom, { statut: 'À faire', note: notes[0] });

      const drawer = await openEditStep(page, nom);
      for (const note of notes.slice(1)) {
        await drawer.getByRole('button', { name: 'Ajouter une autre note' }).click();
        // The new, empty note is appended last and receives the focus.
        const newNote = drawer.getByRole('textbox', { name: /^Ajouter une note/ }).last();
        await expect(newNote).toBeFocused();
        await newNote.fill(note);
      }
      await saveStep(drawer);
      await expect(drawer).toBeHidden();

      // Only the 3 latest notes are shown until the toggle is used.
      const step = stepItem(page, nom);
      const toggle = step.getByRole('button', { name: 'Afficher les notes précédentes' });
      await expect(toggle).toBeVisible();
      await toggle.click();
      for (const note of notes) {
        await expect(step.getByText(note)).toBeVisible();
      }
      await expect(step.getByRole('button', { name: 'Masquer les notes précédentes' })).toBeVisible();
    });

    test('8. supprime une note existante', async () => {
      const nom = uniqueName('note supprimée');
      const note = `Note à supprimer ${randomUUID().slice(0, 8)}`;
      const step = await createStep(page, nom, { statut: 'À faire', note });
      await expect(step.getByText(note)).toBeVisible();

      const drawer = await openEditStep(page, nom);
      await drawer.getByRole('button', { name: /^Supprimer la note du / }).click();
      await saveStep(drawer);
      await expect(drawer).toBeHidden();

      await expect(step.getByText(note)).toHaveCount(0);
      await page.reload();
      await expect(stepItem(page, nom)).toBeVisible();
      await expect(stepItem(page, nom).getByText(note)).toHaveCount(0);
    });

    test("9. l'étape système « Création de la requête » n'est pas modifiable", async () => {
      const creation = stepItem(page, 'Création de la requête');
      await expect(creation).toBeVisible();
      await expect(creation.getByRole('button', { name: "Modifier l'étape" })).toHaveCount(0);
    });
  });

  test.describe('C. Suppression', () => {
    test('10. « Annuler » dans la modale de suppression conserve l’étape', async () => {
      const nom = uniqueName('conservée');
      await createStep(page, nom, { statut: 'À faire' });

      const drawer = await openEditStep(page, nom);
      await drawer.getByRole('button', { name: "Supprimer l'étape" }).click();
      const modal = page.getByRole('dialog', { name: "Suppression d'une étape" });
      await expect(modal).toBeVisible();
      await modal.getByRole('button', { name: 'Annuler', exact: true }).click();
      await expect(modal).toBeHidden();
      await drawer.getByRole('button', { name: 'Annuler', exact: true }).click();

      await page.reload();
      await expect(stepItem(page, nom)).toBeVisible();
    });

    test("11. supprime définitivement l'étape", async () => {
      const nom = uniqueName('supprimée');
      await createStep(page, nom, { statut: 'À faire', note: 'Note liée', files: [FIXTURES.pdf] });

      const drawer = await openEditStep(page, nom);
      await drawer.getByRole('button', { name: "Supprimer l'étape" }).click();
      const modal = page.getByRole('dialog', { name: "Suppression d'une étape" });
      await modal.getByRole('button', { name: 'Supprimer', exact: true }).click();
      await expectToast(page, 'Étape supprimée');

      await expect(stepItem(page, nom)).toHaveCount(0);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Création de la requête', level: 3 })).toBeVisible();
      await expect(stepItem(page, nom)).toHaveCount(0);
    });
  });

  test.describe('D. Pièces jointes', () => {
    test('12. et 13. ajoute un PDF et une image, puis télécharge le PDF original', async () => {
      const nom = uniqueName('PJ');
      const step = await createStep(page, nom, { statut: 'À faire', files: [FIXTURES.pdf, FIXTURES.image] });
      const pdfLink = fileLink(step, fixtureName(FIXTURES.pdf));
      await expect(pdfLink).toBeVisible();
      await expect(fileLink(step, fixtureName(FIXTURES.image))).toBeVisible();

      const { body, contentDisposition } = await downloadStepFile(context.request, await originalFileHref(pdfLink));
      expect(contentDisposition).toContain(fixtureName(FIXTURES.pdf));
      expect(body.equals(readFileSync(FIXTURES.pdf))).toBe(true);
    });

    test('14. retire une pièce jointe existante depuis le panneau de modification', async () => {
      const nom = uniqueName('PJ retirée');
      const step = await createStep(page, nom, { statut: 'À faire', files: [FIXTURES.pdf, FIXTURES.image] });
      await expect(fileLink(step, fixtureName(FIXTURES.image))).toBeVisible();

      const drawer = await openEditStep(page, nom);
      await drawer.getByRole('button', { name: `Retirer le fichier ${fixtureName(FIXTURES.image)}` }).click();
      await saveStep(drawer);
      await expectToast(page, 'Étape modifiée');

      await expect(fileLink(step, fixtureName(FIXTURES.image))).toHaveCount(0);
      await expect(fileLink(step, fixtureName(FIXTURES.pdf))).toBeVisible();
      const saved = (await getProcessingSteps(context.request, requeteId)).find((s) => s.nom === nom);
      expect(saved?.uploadedFiles.map((file) => file.fileName)).toEqual([fixtureName(FIXTURES.pdf)]);
    });

    test("15. un fichier retiré de la sélection avant l'enregistrement n'est pas téléversé", async () => {
      const nom = uniqueName('sélection');
      const drawer = await openCreateStep(page);
      await nomInput(drawer).fill(nom);
      await fileInput(drawer).setInputFiles([FIXTURES.pdf, FIXTURES.image]);
      await drawer.getByRole('button', { name: `Supprimer ${fixtureName(FIXTURES.image)}` }).click();
      await saveStep(drawer);
      await expect(drawer).toBeHidden({ timeout: 15000 });

      const step = stepItem(page, nom);
      await expect(fileLink(step, fixtureName(FIXTURES.pdf))).toBeVisible();
      await expect(fileLink(step, fixtureName(FIXTURES.image))).toHaveCount(0);
    });

    test('16. refuse un fichier au format non supporté', async () => {
      const before = await stepCount();
      const drawer = await openCreateStep(page);
      await nomInput(drawer).fill(uniqueName('format refusé'));
      await fileInput(drawer).setInputFiles(FIXTURES.rejected);
      await saveStep(drawer);

      await expect(drawer.getByText(/Le format du fichier n'est pas supporté/)).toBeVisible();
      await expect(drawer).toBeVisible();
      expect(await stepCount()).toBe(before);
      await drawer.getByRole('button', { name: 'Annuler', exact: true }).click();
    });
  });

  test.describe('E. Rappels', () => {
    test('17. un rappel à 7 jours affiche la date calculée', async () => {
      const nom = uniqueName('rappel 7j');
      const drawer = await openCreateStep(page);
      await nomInput(drawer).fill(nom);
      await rappelSelect(drawer).selectOption({ label: '7 jours' });
      await saveStep(drawer);
      await expect(drawer).toBeHidden();

      await expect(stepItem(page, nom).getByText(`Rappel le ${frenchDate(7)}`)).toBeVisible();
    });

    test('18. une date de rappel personnalisée est obligatoire et doit être valide', async () => {
      const nom = uniqueName('rappel perso');
      const drawer = await openCreateStep(page);
      await nomInput(drawer).fill(nom);
      await rappelSelect(drawer).selectOption({ label: 'Date personnalisée' });

      await saveStep(drawer);
      await expect(
        drawer.getByText(
          'Le champ « Rappeler cette étape le » est obligatoire lorsque vous choisissez une date personnalisée.',
        ),
      ).toBeVisible();

      await rappelDateInput(drawer).click();
      await page.keyboard.type('31');
      await saveStep(drawer);
      await expect(
        drawer.getByText(/Le champ « Rappeler cette étape le » est incomplet ou contient une date non valide/),
      ).toBeVisible();

      await rappelDateInput(drawer).fill(isoDate(20));
      await saveStep(drawer);
      await expect(drawer).toBeHidden();
      await expect(stepItem(page, nom).getByText(`Rappel le ${frenchDate(20)}`)).toBeVisible();
    });

    test('19. « Désactiver » supprime le rappel', async () => {
      const nom = uniqueName('rappel désactivé');
      const drawer = await openCreateStep(page);
      await nomInput(drawer).fill(nom);
      await rappelSelect(drawer).selectOption({ label: '15 jours' });
      await saveStep(drawer);
      await expect(drawer).toBeHidden();

      const step = stepItem(page, nom);
      await expect(step.getByText(`Rappel le ${frenchDate(15)}`)).toBeVisible();
      await step.getByRole('button', { name: 'Désactiver le rappel' }).click();
      await expectToast(page, 'Rappel désactivé avec succès');
      await expect(step.getByText(/Rappel le/)).toHaveCount(0);

      await page.reload();
      await expect(stepItem(page, nom)).toBeVisible();
      await expect(stepItem(page, nom).getByText(/Rappel le/)).toHaveCount(0);
      await expect(stepDrawer(page)).toHaveCount(0);
    });
  });
});
