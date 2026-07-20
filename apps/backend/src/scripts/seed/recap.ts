import type { GeneratedRequete } from './graph.builder.js';
import type { SeedConfig } from './types.js';
import type { SeededUser } from './users.factory.js';

const dematSocialLabel = (config: SeedConfig): string => {
  switch (config.dematSocial) {
    case 'FAKE':
      return `${config.dematSocialFakeCount} fausse(s)`;
    case 'REAL_IMPORT':
      return 'vrai import';
    default:
      return 'aucune';
  }
};

/**
 * Summary shown before confirmation.
 */
export const printPlan = (config: SeedConfig): void => {
  console.log('\n── Récapitulatif ──────────────────────────────');
  console.log(`  Reset base           : ${config.reset ? 'oui' : 'non'}`);
  console.log(`  Utilisateurs         : ${config.createUsers ? `oui (+${config.customUsers.length} custom)` : 'non'}`);
  console.log(`  Requêtes manuelles   : ${config.manualRequetesCount} par ARS (Normandie + IDF + 1-2 partagées)`);
  console.log(`  Requêtes DematSocial : ${dematSocialLabel(config)}`);
  console.log(`  Feature flags        : ${config.enableFeatureFlags ? 'activés' : 'non'}`);
  console.log(`  Graine faker         : ${config.fakerSeed ?? 'aléatoire'}`);
  console.log('───────────────────────────────────────────────\n');
};

/**
 * Final summary: what to log in with, and what was generated.
 */
export const printResult = (users: SeededUser[], requetes: GeneratedRequete[], featureFlags: string[]): void => {
  console.log('\n✅ Seed terminé.\n');
  if (users.length > 0) {
    console.log('Utilisateurs (login ProConnect par email) :');
    for (const user of users) {
      const entite = user.entite ? ` · ${user.entite}` : '';
      console.log(`  • ${user.email.padEnd(24)} ${user.role}${entite}`);
    }
    console.log('');
  }
  if (requetes.length > 0) {
    console.log(`Requêtes générées (${requetes.length}) :`);
    for (const requete of requetes) {
      console.log(
        `  • ${requete.id.padEnd(16)} ${requete.entite.padEnd(10)} ${requete.origin.padEnd(12)} ${requete.statut.padEnd(10)} ${requete.familyLabel}`,
      );
    }
    console.log('');
  }
  if (featureFlags.length > 0) {
    console.log(`Feature flags activés : ${featureFlags.join(', ')}\n`);
  }
};
