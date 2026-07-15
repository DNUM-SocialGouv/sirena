#!/usr/bin/env node

/**
 * Supprime en masse toutes les Requete liées à un EntiteID, ainsi que toutes
 * leurs données associées. Une Requete est considérée comme liée à l'entité
 * soit directement (RequeteEntite), soit via une de ses Situation
 * (SituationEntite).
 *
 * Contrairement à deleteRequeteWithRelatedData (sirecMigration.service.ts) qui
 * traite une Requete à la fois, ce script groupe les ids par lots et supprime
 * chaque lot avec des deleteMany plutôt qu'un aller-retour DB par requête —
 * indispensable dès que le nombre de requêtes à purger dépasse quelques
 * dizaines.
 *
 * ATTENTION : une Requete peut être liée à plusieurs entités (transfert entre
 * entités). Ce script supprime la Requete dans son intégralité, y compris ses
 * liens avec d'éventuelles autres entités.
 *
 * Usage:
 *   pnpm op:delete-requetes-by-entite --entite-id <id> --dry-run   # prévisualise
 *   pnpm op:delete-requetes-by-entite --entite-id <id>             # supprime
 */

import { prisma } from '@sirena/db';

const BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function deleteRequetesWithRelatedData(requeteIds: string[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const situations = await tx.situation.findMany({
      where: { requeteId: { in: requeteIds } },
      select: { misEnCauseId: true, lieuDeSurvenueId: true, demarchesEngageesId: true },
    });
    const misEnCauseIds = situations.map((s) => s.misEnCauseId);
    const lieuDeSurvenueIds = situations.map((s) => s.lieuDeSurvenueId);
    const demarchesEngageesIds = situations.map((s) => s.demarchesEngageesId);
    // Non cascadé depuis DemarchesEngagees : fichiers de réponse d'établissement
    await tx.uploadedFile.deleteMany({ where: { demarchesEngageesId: { in: demarchesEngageesIds } } });
    // Ces 3 tables sont référencées PAR Situation (relations 1-1, cf. @unique) :
    // les supprimer cascade la Situation elle-même (et ses dépendances : Fait,
    // SituationEntite, Adresse de LieuDeSurvenue)
    await tx.misEnCause.deleteMany({ where: { id: { in: misEnCauseIds } } });
    await tx.lieuDeSurvenue.deleteMany({ where: { id: { in: lieuDeSurvenueIds } } });
    await tx.demarchesEngagees.deleteMany({ where: { id: { in: demarchesEngageesIds } } });
    // Cascade : RequeteEntite, RequeteEtape (+ notes, motifs de clôture),
    // PersonneConcernee déclarant/participant (+ Identite/Adresse),
    // UploadedFile rattachés directement à la requête
    await tx.requete.deleteMany({ where: { id: { in: requeteIds } } });
  });
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const entiteIdFlagIndex = args.indexOf('--entite-id');
const entiteId = entiteIdFlagIndex >= 0 ? args[entiteIdFlagIndex + 1] : null;

if (process.env.NODE_ENV === 'production') {
  console.error("Ce script ne doit pas être lancé dans l'environnement de prod. ");
  process.exit(1);
}

if (!entiteId) {
  console.error('Usage: pnpm op:delete-requetes-by-entite --entite-id <id> [--dry-run]');
  process.exit(1);
}

async function main() {
  const entite = await prisma.entite.findUnique({
    where: { id: entiteId as string },
    select: { id: true, nomComplet: true },
  });

  if (!entite) {
    console.error(`Entité introuvable : ${entiteId}`);
    process.exit(1);
  }

  const requeteEntiteLinks = await prisma.requeteEntite.findMany({
    where: { entiteId: entite.id },
    select: { requeteId: true },
  });

  const situationLinks = await prisma.situation.findMany({
    where: { requeteId: { not: null }, situationEntites: { some: { entiteId: entite.id } } },
    select: { requeteId: true },
  });

  const requeteIds = [
    ...new Set([...requeteEntiteLinks.map((l) => l.requeteId), ...situationLinks.map((l) => l.requeteId as string)]),
  ];

  console.log(`Entité "${entite.nomComplet}" (${entite.id})`);

  if (requeteIds.length === 0) {
    console.log('Aucune requête liée à cette entité.');
    await prisma.$disconnect();
    return;
  }

  console.log(`${requeteIds.length} requête(s) trouvée(s)`);

  if (isDryRun) {
    console.log('\n--dry-run : aucune suppression effectuée.');
    await prisma.$disconnect();
    return;
  }

  const batches = chunk(requeteIds, BATCH_SIZE);
  let done = 0;
  for (const batch of batches) {
    await deleteRequetesWithRelatedData(batch);
    done += batch.length;
    console.log(`[${done}/${requeteIds.length}] requête(s) supprimée(s).`);
  }

  console.log(`✅ ${done} requête(s) supprimée(s) pour l'entité "${entite.nomComplet}" (${entite.id}).`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
