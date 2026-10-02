import { randomUUID } from 'node:crypto';
import { type Browser, type BrowserContext, expect, type Page, test } from '@playwright/test';
import { autoCloseAnnouncements } from './utils/announcements';
import { AUTH_CONFIGS, type AuthConfig, ensureAuthenticationFileExists, LOCAL_AUTH_CONFIGS } from './utils/authHelper';
import { isLocalTarget } from './utils/constants';
import {
  createStep,
  gotoProcessing,
  nomInput,
  openCreateStep,
  partageGroup,
  saveStep,
  stepItem,
} from './utils/processingPage';
import { assignEntites, closeRequete, createRequete, getProcessingSteps } from './utils/requeteApi';
import { getSeedUserEntite } from './utils/seedData';

type Session = { context: BrowserContext; page: Page };

async function openSession(browser: Browser, config: AuthConfig): Promise<Session> {
  const authFile = await ensureAuthenticationFileExists(browser, config);
  const context = await browser.newContext({ storageState: authFile });
  await autoCloseAnnouncements(context);
  return { context, page: await context.newPage() };
}

/**
 * A request shared between ARS Île-de-France (owner, user19) and ARS Normandie
 * (user18, plus a reader). These users only exist in the local seed.
 */
test.describe('Traitement : requête multi-entités et droits', () => {
  test.skip(!isLocalTarget, 'Needs the seeded Normandie users, only available with E2E_TARGET=local.');
  test.describe.configure({ mode: 'serial' });

  let owner: Session;
  let other: Session;
  let reader: Session;
  let requeteId: string;
  let otherEntite: { id: string; nomComplet: string };

  const sharedStep = `e2e partagée ${randomUUID().slice(0, 8)}`;
  const privateStep = `e2e privée ${randomUUID().slice(0, 8)}`;
  const otherEntiteStep = `e2e Normandie ${randomUUID().slice(0, 8)}`;

  test.beforeAll(async ({ browser }) => {
    owner = await openSession(browser, AUTH_CONFIGS.ENTITY_ADMIN_USER_1);
    other = await openSession(browser, LOCAL_AUTH_CONFIGS.OTHER_ENTITY_ADMIN);
    reader = await openSession(browser, LOCAL_AUTH_CONFIGS.READER);

    const ownerEntite = await getSeedUserEntite(AUTH_CONFIGS.ENTITY_ADMIN_USER_1.user);
    otherEntite = await getSeedUserEntite(LOCAL_AUTH_CONFIGS.OTHER_ENTITY_ADMIN.user);
    ({ id: requeteId } = await createRequete(owner.context.request));
    await assignEntites(owner.context.request, requeteId, [ownerEntite.id, otherEntite.id]);
  });

  test.afterAll(async () => {
    try {
      if (requeteId) {
        await closeRequete(owner.context.request, requeteId);
        await closeRequete(other.context.request, requeteId);
      }
    } finally {
      for (const session of [owner, other, reader]) {
        await session?.context.close();
      }
    }
  });

  test('22. le choix du partage est obligatoire sur une requête multi-entités', async () => {
    const { page } = owner;
    await gotoProcessing(page, requeteId);
    const before = (await getProcessingSteps(owner.context.request, requeteId)).length;

    const drawer = await openCreateStep(page);
    await expect(partageGroup(drawer)).toHaveAccessibleName(/Afficher l.étape pour les autres entités affectées/);
    await nomInput(drawer).fill(`e2e sans partage ${randomUUID().slice(0, 8)}`);
    await saveStep(drawer);

    await expect(
      drawer.getByText(/Le champ "Afficher l’étape pour les autres entités affectées" est obligatoire/),
    ).toBeVisible();
    await expect(drawer).toBeVisible();
    expect((await getProcessingSteps(owner.context.request, requeteId)).length).toBe(before);
    await drawer.getByRole('button', { name: 'Annuler', exact: true }).click();
  });

  test("23. une étape partagée est visible par l'autre entité, une étape non partagée ne l'est pas", async () => {
    await gotoProcessing(owner.page, requeteId);
    await createStep(owner.page, sharedStep, { statut: 'À faire', partagee: 'Oui' });
    await createStep(owner.page, privateStep, { statut: 'À faire', partagee: 'Non' });

    await gotoProcessing(other.page, requeteId);
    await expect(stepItem(other.page, sharedStep)).toBeVisible();
    await expect(stepItem(other.page, privateStep)).toHaveCount(0);
  });

  test("25. l'étape d'une autre entité est visible mais pas modifiable", async () => {
    const { page } = other;
    await gotoProcessing(page, requeteId);

    const foreignStep = stepItem(page, sharedStep);
    await expect(foreignStep).toHaveAttribute('data-entity-relation', 'foreign');
    await expect(foreignStep.getByRole('button', { name: "Modifier l'étape" })).toHaveCount(0);

    // The other entity keeps full control over its own steps.
    const ownStep = await createStep(page, otherEntiteStep, { statut: 'À faire', partagee: 'Oui' });
    await expect(ownStep).toHaveAttribute('data-entity-relation', 'owner');
    await expect(ownStep.getByRole('button', { name: "Modifier l'étape" })).toBeVisible();
  });

  test("9 bis. l'étape système « Affectation » n'est pas modifiable", async () => {
    const { page } = owner;
    await gotoProcessing(page, requeteId);
    const affectation = page
      .locator('[data-timeline-item-type]')
      .filter({ has: page.getByRole('heading', { level: 3, name: /Affectation/ }) })
      .first();
    await expect(affectation).toBeVisible();
    await expect(affectation.getByRole('button', { name: "Modifier l'étape" })).toHaveCount(0);
  });

  test("24. le filtre par entité restreint la frise et reste dans l'URL", async () => {
    const { page } = owner;
    await gotoProcessing(page, requeteId);
    const filter = page.getByRole('group', { name: 'Filtrer par entité' });
    await expect(stepItem(page, sharedStep)).toBeVisible();
    await expect(stepItem(page, otherEntiteStep)).toBeVisible();

    await filter.getByText(otherEntite.nomComplet, { exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]entiteId=${otherEntite.id}`));
    await expect(stepItem(page, otherEntiteStep)).toBeVisible();
    await expect(stepItem(page, sharedStep)).toHaveCount(0);

    await page.reload();
    await expect(filter.getByRole('radio', { name: new RegExp(`${otherEntite.nomComplet}$`) })).toBeChecked();
    await expect(stepItem(page, sharedStep)).toHaveCount(0);

    await filter.getByText('Toutes', { exact: true }).click();
    await expect(page).not.toHaveURL(/entiteId=/);
    await expect(stepItem(page, sharedStep)).toBeVisible();
    await expect(stepItem(page, otherEntiteStep)).toBeVisible();
  });

  test('31. un lecteur voit la frise en lecture seule, sans aucune action', async () => {
    const { page } = reader;
    await gotoProcessing(page, requeteId);

    await expect(
      page.getByText("Accès en lecture seule : l'édition n'est pas disponible avec vos autorisations actuelles."),
    ).toBeVisible();
    await expect(stepItem(page, otherEntiteStep)).toBeVisible();
    await expect(stepItem(page, 'Création de la requête')).toBeVisible();
    for (const action of ['Ajouter une étape', 'Clôturer', 'Rouvrir', "Modifier l'étape", 'Envoyer']) {
      await expect(page.getByRole('button', { name: action, exact: true })).toHaveCount(0);
    }
  });
});
