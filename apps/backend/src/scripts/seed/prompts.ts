import { confirm, input, number, select } from '@inquirer/prompts';
import { ROLES } from '@sirena/common/constants';
import { ARS_IDF_REG_LIB, ARS_NORMANDIE_REG_LIB } from './entites.js';
import type { CustomUserInput, DematSocialMode, SeedConfig } from './types.js';

const RECOMMENDED_MANUAL_COUNT = 11;

/**
 * Reads --seed=<n> from the command line (reproducible faker runs).
 */
const parseFakerSeed = (): number | null => {
  const arg = process.argv.find((a) => a.startsWith('--seed='));
  if (!arg) return null;
  const value = Number(arg.split('=')[1]);
  return Number.isFinite(value) ? value : null;
};

const askCustomUsers = async (): Promise<CustomUserInput[]> => {
  const users: CustomUserInput[] = [];

  let addMore = await confirm({ message: 'Ajouter un utilisateur supplémentaire ?', default: false });
  while (addMore) {
    const email = await input({
      message: '  Email :',
      validate: (v) => (/^\S+@\S+\.\S+$/.test(v) ? true : 'Email invalide'),
    });
    const role = await select({
      message: '  Rôle :',
      choices: Object.values(ROLES).map((r) => ({ name: r, value: r })),
    });
    const entiteRegLib = await select<string | null>({
      message: '  Entité :',
      choices: [
        { name: 'Aucune', value: null },
        { name: 'ARS Normandie', value: ARS_NORMANDIE_REG_LIB },
        { name: 'ARS Île-de-France', value: ARS_IDF_REG_LIB },
      ],
    });

    users.push({ email, role, entiteRegLib });
    addMore = await confirm({ message: 'Ajouter encore un utilisateur ?', default: false });
  }

  return users;
};

/**
 * Runs all the interactive questions and returns the seed configuration.
 */
export const askSeedConfig = async (): Promise<SeedConfig> => {
  const reset = await confirm({
    message: 'Réinitialiser la base avant de seed ? (reset → generate → build)',
    default: false,
  });

  const createUsers = await confirm({ message: 'Créer les utilisateurs de test ?', default: true });
  const customUsers = createUsers ? await askCustomUsers() : [];

  const manualRequetesCount =
    (await number({
      message: `Combien de requêtes manuelles par ARS ? (recommandé ${RECOMMENDED_MANUAL_COUNT}, généré pour Normandie ET IDF + 1-2 partagées)`,
      default: RECOMMENDED_MANUAL_COUNT,
      min: 1,
    })) ?? RECOMMENDED_MANUAL_COUNT;

  if (manualRequetesCount < RECOMMENDED_MANUAL_COUNT) {
    console.log(
      `⚠️  ${manualRequetesCount} < ${RECOMMENDED_MANUAL_COUNT} : tous les cas ne seront pas forcément couverts par ARS.`,
    );
  }

  const dematSocial = await select<DematSocialMode>({
    message: 'Requêtes DematSocial ?',
    choices: [
      { name: 'Générer des fausses (injectées en base)', value: 'FAKE' },
      { name: 'Lancer le vrai import (API externe)', value: 'REAL_IMPORT' },
      { name: 'Aucune', value: 'NONE' },
    ],
    default: 'FAKE',
  });

  const dematSocialFakeCount =
    dematSocial === 'FAKE'
      ? ((await number({ message: 'Combien de fausses requêtes DematSocial ?', default: 5, min: 1 })) ?? 5)
      : 0;

  const enableFeatureFlags = await confirm({ message: 'Activer les feature flags en local ?', default: true });

  return {
    reset,
    createUsers,
    customUsers,
    manualRequetesCount,
    dematSocial,
    dematSocialFakeCount,
    enableFeatureFlags,
    fakerSeed: parseFakerSeed(),
  };
};
