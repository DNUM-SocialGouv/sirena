#!/usr/bin/env node

/**
 * Local seed CLI (SIRENA-683).
 *
 * Fills the local database with test users and varied requests.
 * Interactive: `pnpm op:seed` (`--seed=<n>` option for reproducible runs).
 *
 * Increment 1: skeleton (prompts, reset, users, recap).
 * Increment 2: manual requests engine + case families.
 * Increment 3: DematSocial (fake / real import) + feature flags.
 */

import { confirm } from '@inquirer/prompts';
import { prisma } from '../../libs/prisma.js';
import { buildSeedContext } from './context.js';
import { runRealDematSocialImport } from './dematSocialImport.js';
import { resolveArsEntites } from './entites.js';
import { seedFeatureFlags } from './featureFlags.factory.js';
import type { GeneratedRequete } from './graph.builder.js';
import { askSeedConfig } from './prompts.js';
import { printPlan, printResult } from './recap.js';
import { seedDematSocialRequetes, seedManualRequetes } from './requetes.factory.js';
import { runReset } from './reset.js';
import { type SeededUser, seedUsers } from './users.factory.js';

async function main() {
  const config = await askSeedConfig();
  printPlan(config);

  const confirmed = await confirm({ message: 'Confirmer et lancer le seed ?', default: true });
  if (!confirmed) {
    console.log('Annulé.');
    return;
  }

  if (config.reset) {
    runReset();
  }

  let users: SeededUser[] = [];
  if (config.createUsers) {
    console.log('▶ Création des utilisateurs…');
    const entites = await resolveArsEntites();
    users = await seedUsers(entites, config.customUsers);
  }

  const requetes: GeneratedRequete[] = [];
  const needContext = config.manualRequetesCount > 0 || config.dematSocial === 'FAKE';
  const ctx = needContext ? await buildSeedContext(config.fakerSeed) : null;

  if (ctx && config.manualRequetesCount > 0) {
    console.log(`▶ Génération de ${config.manualRequetesCount} requête(s) manuelle(s)…`);
    requetes.push(...(await seedManualRequetes(config.manualRequetesCount, ctx)));
  }

  if (config.dematSocial === 'FAKE' && ctx) {
    console.log(`▶ Génération de ${config.dematSocialFakeCount} fausse(s) requête(s) DematSocial…`);
    requetes.push(...(await seedDematSocialRequetes(config.dematSocialFakeCount, ctx)));
  } else if (config.dematSocial === 'REAL_IMPORT') {
    runRealDematSocialImport();
  }

  let featureFlags: string[] = [];
  if (config.enableFeatureFlags) {
    console.log('▶ Activation des feature flags…');
    featureFlags = await seedFeatureFlags();
  }

  printResult(users, requetes, featureFlags);
}

main()
  .catch((error) => {
    console.error('\n❌ Erreur pendant le seed :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
