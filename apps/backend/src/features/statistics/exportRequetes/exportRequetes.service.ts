import { CSV_BOM, serializeCsvRow } from '@sirena/common/utils';
import { type Prisma, prisma } from '../../../libs/prisma.js';
import { getEntiteDescendantIds } from '../../entites/entites.service.js';
import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import { deriveDepartmentCodeFromPostalCode } from './exportRequetesFormatters.js';
import { buildExportRequetesRows, type ExportRequeteRecord } from './exportRequetesRows.js';

const exportRequetesSelect = {
  id: true,
  createdAt: true,
  receptionDate: true,
  dateDemandeDeclarant: true,
  declarant: {
    select: {
      estVictime: true,
      lienVictime: { select: { label: true } },
      lienAutrePrecision: true,
      isTuteur: true,
      adresse: { select: { codePostal: true, ville: true } },
      veutGarderAnonymat: true,
      estSignalementProfessionnel: true,
    },
  },
  participant: {
    select: {
      identite: { select: { civilite: { select: { label: true } } } },
      age: { select: { label: true } },
      dateNaissance: true,
      adresse: { select: { codePostal: true, ville: true } },
      veutGarderAnonymat: true,
      estVictimeInformee: true,
      mesureProtection: true,
      estHandicapee: true,
      aAutrePersonnes: true,
    },
  },
  provenance: { select: { label: true } },
  receptionType: { select: { label: true } },
  etapes: {
    select: {
      entiteId: true,
      statutId: true,
      createdAt: true,
      clotureEffectiveDate: true,
      clotureReason: { select: { label: true } },
    },
  },
  requeteEntites: {
    select: {
      entiteId: true,
      entite: {
        select: {
          label: true,
          nomComplet: true,
          entiteTypeId: true,
          entiteMere: { select: { label: true } },
        },
      },
      priorite: { select: { label: true } },
      statut: { select: { label: true } },
    },
  },
  situations: {
    select: {
      lieuDeSurvenue: {
        select: {
          lieuTypeId: true,
          lieuPrecision: true,
          codePostal: true,
          adresse: { select: { codePostal: true, ville: true } },
          lieuType: { select: { label: true } },
          transportType: { select: { label: true } },
        },
      },
      misEnCause: {
        select: {
          codePostal: true,
          misEnCauseType: { select: { label: true } },
          misEnCauseTypePrecision: { select: { label: true } },
        },
      },
      faits: {
        select: {
          dateDebut: true,
          dateFin: true,
          motifs: { select: { motifId: true, motif: { select: { label: true } } } },
          motifsDeclaratifs: { select: { motifDeclaratif: { select: { label: true } } } },
          consequences: { select: { consequence: { select: { label: true } } } },
        },
      },
      domainesFonctionnels: { select: { label: true } },
      demarchesEngagees: {
        select: {
          dateContactEtablissement: true,
          etablissementARepondu: true,
          organisme: true,
          datePlainte: true,
          autoriteType: { select: { label: true } },
          demarches: { select: { label: true } },
        },
      },
      situationEntites: {
        select: {
          entite: {
            select: {
              label: true,
              nomComplet: true,
              entiteMere: {
                select: {
                  label: true,
                  nomComplet: true,
                  entiteMere: { select: { label: true, nomComplet: true } },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RequeteSelect;

type ExportRequetePrismaPayload = Prisma.RequeteGetPayload<{
  select: typeof exportRequetesSelect;
}>;

// The export can span an entity's whole subtree. Reading every requête (with its
// deep relations) in a single findMany, then holding the mapped records and the
// full CSV string at once, keeps several copies of the dataset in memory on a pod
// with a hard memory limit. Instead we page through the rows with a cursor and
// emit the CSV line by line, so peak memory is one page rather than the whole set.
const EXPORT_PAGE_SIZE = 500;

// Postal-code-bearing subset of exportRequetesSelect, used by the light first pass
// that resolves department references before any row is emitted.
const postalCodeSelect = {
  id: true,
  declarant: { select: { adresse: { select: { codePostal: true } } } },
  participant: { select: { adresse: { select: { codePostal: true } } } },
  situations: {
    select: {
      lieuDeSurvenue: { select: { codePostal: true, adresse: { select: { codePostal: true } } } },
      misEnCause: { select: { codePostal: true } },
    },
  },
} satisfies Prisma.RequeteSelect;

function buildRequeteWhere(entiteIds: string[]): Prisma.RequeteWhereInput {
  return { requeteEntites: { some: { entiteId: { in: entiteIds } } } };
}

async function collectPostalCodes(where: Prisma.RequeteWhereInput): Promise<string[]> {
  const codePostaux = new Set<string>();
  let cursor: string | undefined;

  while (true) {
    const page = await prisma.requete.findMany({
      where,
      select: postalCodeSelect,
      orderBy: { id: 'asc' },
      take: EXPORT_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) break;

    for (const requete of page) {
      for (const codePostal of [
        requete.declarant?.adresse?.codePostal,
        requete.participant?.adresse?.codePostal,
        ...requete.situations.flatMap((situation) => [
          situation.lieuDeSurvenue?.adresse?.codePostal || situation.lieuDeSurvenue?.codePostal,
          situation.misEnCause?.codePostal,
        ]),
      ]) {
        if (codePostal) codePostaux.add(codePostal);
      }
    }

    if (page.length < EXPORT_PAGE_SIZE) break;
    cursor = page[page.length - 1].id;
  }

  return Array.from(codePostaux);
}

// Streams the CSV in write-ready chunks: the first chunk is the BOM + header line,
// each subsequent chunk is a newline + one row. Concatenated, the chunks are
// byte-for-byte identical to serializeCsv(headers, rows) over the same rows.
export async function* streamExportRequetesCsv(topEntiteId: string): AsyncGenerator<string> {
  const entiteIds = (await getEntiteDescendantIds(topEntiteId)) ?? [];
  const where = buildRequeteWhere(entiteIds);

  const codePostaux = await collectPostalCodes(where);
  const { departmentCodesByPostalCode, departementNamesByCode } = await getDepartmentReferences(codePostaux);
  const options = { topEntiteId, departmentCodesByPostalCode, departementNamesByCode };

  yield CSV_BOM + serializeCsvRow([...EXPORT_REQUETES_HEADERS]);

  let cursor: string | undefined;
  while (true) {
    const page = await prisma.requete.findMany({
      where,
      select: exportRequetesSelect,
      orderBy: { id: 'asc' },
      take: EXPORT_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (page.length === 0) break;

    for (const requete of page) {
      for (const row of buildExportRequetesRows([toExportRequeteRecord(requete)], options)) {
        yield `\n${serializeCsvRow(row)}`;
      }
    }

    if (page.length < EXPORT_PAGE_SIZE) break;
    cursor = page[page.length - 1].id;
  }
}

export async function generateExportRequetesCsv(topEntiteId: string): Promise<string> {
  let csv = '';
  for await (const chunk of streamExportRequetesCsv(topEntiteId)) {
    csv += chunk;
  }
  return csv;
}

async function getDepartmentReferences(codePostaux: string[]): Promise<{
  departmentCodesByPostalCode: Map<string, string>;
  departementNamesByCode: Map<string, string>;
}> {
  if (codePostaux.length === 0) {
    return { departmentCodesByPostalCode: new Map(), departementNamesByCode: new Map() };
  }

  const inseePostalRows = await prisma.inseePostal.findMany({
    where: { codePostal: { in: codePostaux } },
    select: { codePostal: true, commune: { select: { dptCodeActuel: true } } },
    distinct: ['codePostal'],
  });
  const departmentCodesByPostalCode = new Map(
    inseePostalRows
      .filter((row): row is { codePostal: string; commune: { dptCodeActuel: string } } => row.commune != null)
      .map((row) => [row.codePostal, row.commune.dptCodeActuel]),
  );
  const departmentCodes = Array.from(
    new Set(
      codePostaux.map(
        (codePostal) => departmentCodesByPostalCode.get(codePostal) ?? deriveDepartmentCodeFromPostalCode(codePostal),
      ),
    ),
  ).filter((departmentCode) => departmentCode !== '');

  if (departmentCodes.length === 0) {
    return { departmentCodesByPostalCode, departementNamesByCode: new Map() };
  }

  const communeRows = await prisma.commune.findMany({
    where: { dptCodeActuel: { in: departmentCodes } },
    select: { dptCodeActuel: true, dptLibActuel: true },
    distinct: ['dptCodeActuel'],
  });

  return {
    departmentCodesByPostalCode,
    departementNamesByCode: new Map(communeRows.map((row) => [row.dptCodeActuel, row.dptLibActuel])),
  };
}

function toExportRequeteRecord(requete: ExportRequetePrismaPayload): ExportRequeteRecord {
  return {
    id: requete.id,
    createdAt: requete.createdAt,
    receptionDate: requete.receptionDate,
    dateDemandeDeclarant: requete.dateDemandeDeclarant,
    receptionType: requete.receptionType,
    provenance: requete.provenance,
    declarant: requete.declarant,
    participant: requete.participant,
    requeteEntites: requete.requeteEntites,
    etapes: requete.etapes,
    situations: requete.situations.map((situation) => ({
      lieuDeSurvenue: situation.lieuDeSurvenue,
      misEnCause: situation.misEnCause,
      faits: situation.faits,
      domainesFonctionnels: situation.domainesFonctionnels,
      demarchesEngagees: situation.demarchesEngagees,
      situationEntites: situation.situationEntites,
    })),
  };
}
