import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Locator, type Page } from '@playwright/test';
import { baseUrl } from './constants';

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');

export const FIXTURES = {
  pdf: path.join(fixturesDir, 'e2e-document.pdf'),
  image: path.join(fixturesDir, 'e2e-image.png'),
  rejected: path.join(fixturesDir, 'e2e-archive.zip'),
} as const;

export const fixtureName = (fixture: string) => path.basename(fixture);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** dd/mm/yyyy, as displayed in the timeline. `offsetDays` is added to today (Paris time). */
export const frenchDate = (offsetDays = 0): string => {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
    .format(new Date())
    .split('-')
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day + offsetDays)).toLocaleDateString('fr-FR', { timeZone: 'UTC' });
};

/** yyyy-mm-dd, as expected by `<input type="date">`. */
export const isoDate = (offsetDays = 0): string => frenchDate(offsetDays).split('/').reverse().join('-');

export async function gotoProcessing(page: Page, requeteId: string, search = ''): Promise<void> {
  await page.goto(`${baseUrl}/request/${requeteId}/processing${search}`);
  await expect(page.getByRole('heading', { name: 'Étapes de traitement', level: 2 })).toBeVisible({ timeout: 15000 });
}

/**
 * A timeline item, found by its step title. Multi-entity steps prefix the
 * heading with a screen-reader-only entity type (`ARS - `), hence the suffix match.
 */
export const stepItem = (page: Page, title: string): Locator =>
  page.locator('[data-timeline-item-type]').filter({
    has: page.getByRole('heading', { level: 3, name: new RegExp(`(^|- )${escapeRegExp(title)}$`) }),
  });

export const stepDrawer = (page: Page): Locator =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: /^(Ajouter une étape|Modifier l'étape)/ }) });

export const expectToast = async (page: Page, title: string): Promise<void> => {
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 10000 });
};

/**
 * DSFR hides radio inputs behind their label: click the label, scoped to the
 * group, once the drawer has finished sliding in.
 */
export async function chooseRadio(group: Locator, label: string): Promise<void> {
  const option = group.getByText(label, { exact: true });
  await option.scrollIntoViewIfNeeded();
  await expect(option).toBeVisible();
  await option.click();
  await expect(group.getByRole('radio', { name: label, exact: true })).toBeChecked();
}

export async function openCreateStep(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Ajouter une étape', exact: true }).click();
  const drawer = stepDrawer(page);
  await expect(drawer.getByRole('heading', { name: 'Ajouter une étape' })).toBeVisible();
  return drawer;
}

export async function openEditStep(page: Page, title: string): Promise<Locator> {
  await stepItem(page, title).getByRole('button', { name: "Modifier l'étape" }).click();
  const drawer = stepDrawer(page);
  await expect(drawer.getByRole('heading', { name: `Modifier l'étape « ${title} »` })).toBeVisible();
  return drawer;
}

export const nomInput = (drawer: Locator) => drawer.getByRole('textbox', { name: "Nom de l'étape (obligatoire)" });
export const statutGroup = (drawer: Locator) => drawer.getByTestId('step-statut-choice');
export const partageGroup = (drawer: Locator) => drawer.getByTestId('step-partagee-choice');
export const faitLeInput = (drawer: Locator) => drawer.getByLabel('Fait le (obligatoire)');
export const rappelSelect = (drawer: Locator) =>
  drawer.getByRole('combobox', { name: 'Mettre un rappel pour cette étape (alertes, relances etc.)' });
export const rappelDateInput = (drawer: Locator) => drawer.getByLabel('Rappeler cette étape le (champ obligatoire)');
export const fileInput = (drawer: Locator) => drawer.locator('input[type="file"]');

export async function saveStep(drawer: Locator): Promise<void> {
  await drawer.getByRole('button', { name: 'Enregistrer', exact: true }).click();
}

type CreateStepOptions = {
  statut?: 'Fait' | 'À faire';
  faitLe?: string;
  note?: string;
  files?: string[];
  /** Answer to the sharing question, required on multi-entity requests. */
  partagee?: 'Oui' | 'Non';
};

/** Fills and saves the « Ajouter une étape » drawer, then waits for the step in the timeline. */
export async function createStep(page: Page, nom: string, options: CreateStepOptions = {}): Promise<Locator> {
  const drawer = await openCreateStep(page);
  await nomInput(drawer).fill(nom);
  if (options.statut) {
    await chooseRadio(statutGroup(drawer), options.statut);
  }
  if (options.faitLe) {
    await faitLeInput(drawer).fill(options.faitLe);
  }
  if (options.partagee) {
    await chooseRadio(partageGroup(drawer), options.partagee);
  }
  if (options.note) {
    await drawer.getByRole('textbox', { name: /^Ajouter une note/ }).fill(options.note);
  }
  if (options.files) {
    await fileInput(drawer).setInputFiles(options.files);
  }
  await saveStep(drawer);
  await expect(drawer).toBeHidden({ timeout: 15000 });
  const step = stepItem(page, nom);
  await expect(step).toBeVisible({ timeout: 10000 });
  return step;
}

/** Download link of an attachment (its accessible name starts with the file name). */
export const fileLink = (scope: Locator, fileName: string) =>
  scope.getByRole('link', { name: new RegExp(`^${escapeRegExp(fileName)}`) });

/** The original-file URL behind a download link (the link may point to the sanitized `/safe` copy). */
export async function originalFileHref(link: Locator): Promise<string> {
  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();
  return (href as string).replace(/\/safe$/, '');
}
