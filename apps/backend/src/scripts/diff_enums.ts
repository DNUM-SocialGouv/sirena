import {
  ageLabels,
  autoriteTypeLabels,
  autreProfessionnelPrecisionLabels,
  civiliteLabels,
  consequenceLabels,
  demarcheEngageeLabels,
  entiteTypes,
  lienVictimeLabels,
  lieuTypeLabels,
  MOTIFS_DATA,
  maltraitanceTypeLabels,
  misEnCauseAutreNonProPrecisionLabels,
  misEnCauseEtablissementPrecisionLabels,
  misEnCauseFamillePrecisionLabels,
  misEnCauseProchePrecisionLabels,
  misEnCauseTypeLabels,
  motifLabels,
  professionDomicileTypeLabels,
  professionSantePrecisionLabels,
  professionSocialPrecisionLabels,
  professionTypeLabels,
  receptionTypeLabels,
  requeteClotureReasonLabels,
  requeteEtapeStatutType,
  requetePrioriteType,
  roles,
  statutTypes,
  transportTypeLabels,
} from '@sirena/common/constants';
import { PrismaClient } from '../../generated/client/index.js';
import { createDefaultLogger } from '../helpers/pino.js';

const logger = createDefaultLogger();
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isDumpMigration = args.includes('--dump-migration');
const isInvert = args.includes('--invert');

type EnumDefinition = {
  id: string;
  [key: string]: unknown;
};

interface ModelDelegate {
  findMany: () => Promise<unknown[]>;
}

async function checkEnum(
  tableName: string,
  modelDelegate: ModelDelegate,
  expectedItems: EnumDefinition[],
  keyGen: (item: EnumDefinition) => string = (i) => i.id,
) {
  if (!isDumpMigration) {
    logger.info(`Checking ${tableName}...`);
  }
  const existingItems = (await modelDelegate.findMany()) as EnumDefinition[];
  const existingIds = new Set(existingItems.map(keyGen));
  const expectedIds = new Set(expectedItems.map(keyGen));

  // Build map for easier comparison
  const existingMap = new Map(existingItems.map((item) => [keyGen(item), item]));

  const missingItems = expectedItems.filter((item) => !existingIds.has(keyGen(item)));
  const extraItems = existingItems.filter((item) => !expectedIds.has(keyGen(item)));

  // Detect updates: same key but different values
  const updatedItems: Array<{ old: EnumDefinition; new: EnumDefinition }> = [];
  for (const expectedItem of expectedItems) {
    const key = keyGen(expectedItem);
    const existingItem = existingMap.get(key);
    if (existingItem) {
      // Only compare fields that exist in the DB (existingItem)
      // This prevents detecting updates for fields that only exist in code constants
      const existingKeys = Object.keys(existingItem).sort();

      let hasDifference = false;
      for (const k of existingKeys) {
        const existingValue = existingItem[k];
        const expectedValue = expectedItem[k];
        if (existingValue !== expectedValue) {
          hasDifference = true;
          break;
        }
      }

      if (hasDifference) {
        updatedItems.push({ old: existingItem, new: expectedItem });
      }
    }
  }

  if (missingItems.length === 0 && extraItems.length === 0 && updatedItems.length === 0) {
    if (!isDumpMigration) {
      logger.info(`  ✅ ${tableName} is up to date.`);
    }
    return;
  }

  if (!isDumpMigration) {
    if (missingItems.length > 0) {
      logger.warn(`  ⚠️  ${missingItems.length} missing items in ${tableName}:`);
      missingItems.forEach((item) => {
        logger.warn(`    - ${keyGen(item)}`);
      });
    }

    if (extraItems.length > 0) {
      logger.warn(`  ⚠️  ${extraItems.length} extra items in ${tableName} (to remove):`);
      extraItems.forEach((item) => {
        logger.warn(`    - ${keyGen(item)}`);
      });
    }

    if (updatedItems.length > 0) {
      logger.warn(`  ⚠️  ${updatedItems.length} items to update in ${tableName}:`);
      updatedItems.forEach(({ old, new: newItem }) => {
        logger.warn(`    - ${keyGen(newItem)}: ${JSON.stringify(old)} -> ${JSON.stringify(newItem)}`);
      });
    }
  }

  if (isDumpMigration) {
    // Get DB schema fields from existing items
    // When DB is empty, fall back to common fields (id, label) plus composite key fields
    let dbFields: Set<string>;
    if (existingItems.length > 0) {
      dbFields = new Set(Object.keys(existingItems[0]));
    } else {
      // Fallback: only include standard enum fields
      dbFields = new Set(['id', 'label', 'misEnCauseTypeId', 'sortOrder']);
    }

    if (isInvert) {
      if (missingItems.length > 0) {
        console.log(`\n-- [DOWN] Revert insertion for ${tableName}`);
        missingItems.forEach((item) => {
          let whereClause = '';
          if ('misEnCauseTypeId' in item && 'id' in item) {
            whereClause = `"id" = ${escapeSql(item.id)} AND "misEnCauseTypeId" = ${escapeSql(item.misEnCauseTypeId)}`;
          } else if ('id' in item) {
            whereClause = `"id" = ${escapeSql(item.id)}`;
          } else {
            whereClause = '/* Unknown PK */';
          }
          console.log(`DELETE FROM "public"."${tableName}" WHERE ${whereClause};`);
        });
        console.log('');
      }

      if (extraItems.length > 0) {
        console.log(`\n-- [DOWN] Revert deletion for ${tableName}`);
        const keys = Object.keys(extraItems[0]).filter((k) => dbFields.has(k));
        console.log(`INSERT INTO "public"."${tableName}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES`);
        const values = extraItems
          .map((item) => {
            const vals = keys.map((k) => escapeSql(item[k]));
            return `(${vals.join(', ')})`;
          })
          .join(',\n');
        console.log(`${values};\n`);
      }

      if (updatedItems.length > 0) {
        console.log(`\n-- [DOWN] Revert updates for ${tableName}`);
        updatedItems.forEach(({ old }) => {
          let whereClause = '';
          let setClause = '';
          if ('misEnCauseTypeId' in old && 'id' in old) {
            whereClause = `"id" = ${escapeSql(old.id)} AND "misEnCauseTypeId" = ${escapeSql(old.misEnCauseTypeId)}`;
            const keys = Object.keys(old).filter((k) => k !== 'id' && k !== 'misEnCauseTypeId' && dbFields.has(k));
            setClause = keys.map((k) => `"${k}" = ${escapeSql(old[k])}`).join(', ');
          } else if ('id' in old) {
            whereClause = `"id" = ${escapeSql(old.id)}`;
            const keys = Object.keys(old).filter((k) => k !== 'id' && dbFields.has(k));
            setClause = keys.map((k) => `"${k}" = ${escapeSql(old[k])}`).join(', ');
          } else {
            whereClause = '/* Unknown PK */';
            setClause = '/* Unknown columns */';
          }
          if (setClause) {
            console.log(`UPDATE "public"."${tableName}" SET ${setClause} WHERE ${whereClause};`);
          }
        });
        console.log('');
      }
    } else {
      if (missingItems.length > 0) {
        console.log(`\n-- Missing items for ${tableName}`);
        const keys = Object.keys(missingItems[0]).filter((k) => dbFields.has(k));
        console.log(`INSERT INTO "public"."${tableName}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES`);
        const values = missingItems
          .map((item) => {
            const vals = keys.map((k) => escapeSql(item[k]));
            return `(${vals.join(', ')})`;
          })
          .join(',\n');
        console.log(`${values};\n`);
      }

      if (extraItems.length > 0) {
        console.log(`\n-- Extra items for ${tableName}`);
        extraItems.forEach((item) => {
          let whereClause = '';
          if ('misEnCauseTypeId' in item && 'id' in item) {
            whereClause = `"id" = ${escapeSql(item.id)} AND "misEnCauseTypeId" = ${escapeSql(item.misEnCauseTypeId)}`;
          } else if ('id' in item) {
            whereClause = `"id" = ${escapeSql(item.id)}`;
          } else {
            whereClause = '/* Unknown PK */';
          }
          console.log(`DELETE FROM "public"."${tableName}" WHERE ${whereClause};`);
        });
        console.log('');
      }

      if (updatedItems.length > 0) {
        console.log(`\n-- Items to update for ${tableName}`);
        updatedItems.forEach(({ new: newItem }) => {
          let whereClause = '';
          let setClause = '';
          if ('misEnCauseTypeId' in newItem && 'id' in newItem) {
            whereClause = `"id" = ${escapeSql(newItem.id)} AND "misEnCauseTypeId" = ${escapeSql(newItem.misEnCauseTypeId)}`;
            const keys = Object.keys(newItem).filter((k) => k !== 'id' && k !== 'misEnCauseTypeId' && dbFields.has(k));
            setClause = keys.map((k) => `"${k}" = ${escapeSql(newItem[k])}`).join(', ');
          } else if ('id' in newItem) {
            whereClause = `"id" = ${escapeSql(newItem.id)}`;
            const keys = Object.keys(newItem).filter((k) => k !== 'id' && dbFields.has(k));
            setClause = keys.map((k) => `"${k}" = ${escapeSql(newItem[k])}`).join(', ');
          } else {
            whereClause = '/* Unknown PK */';
            setClause = '/* Unknown columns */';
          }
          if (setClause) {
            console.log(`UPDATE "public"."${tableName}" SET ${setClause} WHERE ${whereClause};`);
          }
        });
        console.log('');
      }
    }
  }
}

function escapeSql(val: unknown): string {
  if (typeof val === 'string') {
    return `'${val.replace(/'/g, "''")}'`;
  }
  if (val === null || val === undefined) {
    return 'NULL';
  }
  return String(val);
}

// Transform simple id:label map to array of objects
function mapToDefinitions(labels: Record<string, string>): EnumDefinition[] {
  return Object.entries(labels).map(([id, label]) => ({ id, label }));
}

async function main() {
  try {
    if (!isDumpMigration) {
      logger.info('🔍 Starting Enum Diff...');
    }

    // Standard Enums (id, label)
    await checkEnum('AgeEnum', prisma.ageEnum, mapToDefinitions(ageLabels));
    await checkEnum('AutoriteTypeEnum', prisma.autoriteTypeEnum, mapToDefinitions(autoriteTypeLabels));
    await checkEnum('CiviliteEnum', prisma.civiliteEnum, mapToDefinitions(civiliteLabels));
    await checkEnum('ConsequenceEnum', prisma.consequenceEnum, mapToDefinitions(consequenceLabels));
    await checkEnum('DemarchesEngageesEnum', prisma.demarchesEngageesEnum, mapToDefinitions(demarcheEngageeLabels));
    await checkEnum('EntiteTypeEnum', prisma.entiteTypeEnum, mapToDefinitions(entiteTypes));
    await checkEnum('LienVictimeEnum', prisma.lienVictimeEnum, mapToDefinitions(lienVictimeLabels));
    await checkEnum('LieuTypeEnum', prisma.lieuTypeEnum, mapToDefinitions(lieuTypeLabels));
    await checkEnum('MaltraitanceTypeEnum', prisma.maltraitanceTypeEnum, mapToDefinitions(maltraitanceTypeLabels));
    await checkEnum('MisEnCauseTypeEnum', prisma.misEnCauseTypeEnum, mapToDefinitions(misEnCauseTypeLabels));
    await checkEnum('MotifDeclaratifEnum', prisma.motifDeclaratifEnum, mapToDefinitions(motifLabels));
    await checkEnum('ReceptionTypeEnum', prisma.receptionTypeEnum, mapToDefinitions(receptionTypeLabels));
    await checkEnum('RequeteEtapeStatutEnum', prisma.requeteEtapeStatutEnum, mapToDefinitions(requeteEtapeStatutType));
    await checkEnum('RoleEnum', prisma.roleEnum, mapToDefinitions(roles));
    await checkEnum('StatutEnum', prisma.statutEnum, mapToDefinitions(statutTypes));
    await checkEnum('TransportTypeEnum', prisma.transportTypeEnum, mapToDefinitions(transportTypeLabels));
    await checkEnum(
      'RequeteClotureReasonEnum',
      prisma.requeteClotureReasonEnum,
      mapToDefinitions(requeteClotureReasonLabels),
    );

    // MotifEnum (from Array)
    await checkEnum('MotifEnum', prisma.motifEnum, MOTIFS_DATA);

    // RequetePrioriteEnum (with sortOrder)
    const prioriteEntries = Object.entries(requetePrioriteType).reverse();
    const prioriteDefs = prioriteEntries.map(([id, label], i) => ({
      id,
      label,
      sortOrder: prioriteEntries.length - i,
    }));
    await checkEnum('RequetePrioriteEnum', prisma.requetePrioriteEnum, prioriteDefs);

    // MisEnCauseTypePrecisionEnum (Complex)
    const precisionDefs: EnumDefinition[] = [];
    const seen = new Set<string>();
    const addPrecisions = (parentTypeId: string, precisionLabels: Record<string, string>) => {
      Object.entries(precisionLabels).forEach(([id, label]) => {
        const key = `${parentTypeId}-${id}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        precisionDefs.push({ id, label, misEnCauseTypeId: parentTypeId });
      });
    };

    addPrecisions('MEMBRE_FAMILLE', misEnCauseFamillePrecisionLabels);
    addPrecisions('PROCHE', misEnCauseProchePrecisionLabels);
    addPrecisions('AUTRE_PERSONNE_NON_PRO', misEnCauseAutreNonProPrecisionLabels);
    addPrecisions('PROFESSIONNEL_SANTE', professionSantePrecisionLabels);
    addPrecisions('PROFESSIONNEL_SOCIAL', professionSocialPrecisionLabels);
    addPrecisions('AUTRE_PROFESSIONNEL', autreProfessionnelPrecisionLabels);
    addPrecisions('ETABLISSEMENT', misEnCauseEtablissementPrecisionLabels);
    // Legacy / Backwards compat
    addPrecisions('PROFESSIONNEL_SANTE', professionTypeLabels);
    addPrecisions('PROFESSIONNEL_SANTE', professionDomicileTypeLabels);

    await checkEnum(
      'MisEnCauseTypePrecisionEnum',
      prisma.misEnCauseTypePrecisionEnum,
      precisionDefs,
      (i) => `${i.misEnCauseTypeId as string}-${i.id}`,
    );

    if (!isDumpMigration) {
      logger.info('🏁 Enum Diff completed.');
    }
  } catch (error) {
    logger.error({ err: error }, '❌ Error during Enum Diff');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
