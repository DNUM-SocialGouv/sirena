import { CSV_BOM, CSV_LINE_SEPARATOR, serializeCsvRow } from '@sirena/common/utils';
import type { ChunkWriter } from '../../../helpers/stream.js';
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
      sirecDepartement: true,
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

const EXPORT_PAGE_SIZE = 500;

export type ExportRequetesCsvWriter = (write: ChunkWriter) => Promise<void>;

const departementSourceSelect = {
  id: true,
  declarant: { select: { adresse: { select: { codePostal: true } } } },
  participant: { select: { adresse: { select: { codePostal: true } } } },
  situations: {
    select: {
      sirecDepartement: true,
      lieuDeSurvenue: { select: { codePostal: true, adresse: { select: { codePostal: true } } } },
      misEnCause: { select: { codePostal: true } },
    },
  },
} satisfies Prisma.RequeteSelect;

type RequetePage<S extends Prisma.RequeteSelect> = (Prisma.RequeteGetPayload<{ select: S }> & { id: string })[];

async function forEachRequetePage<S extends Prisma.RequeteSelect & { id: true }>(
  where: Prisma.RequeteWhereInput,
  select: S,
  onPage: (page: RequetePage<S>) => void | Promise<void>,
): Promise<void> {
  let cursor: string | undefined;

  do {
    const page = (await prisma.requete.findMany({
      where,
      select,
      orderBy: { id: 'asc' },
      take: EXPORT_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })) as RequetePage<S>;

    if (page.length === 0) return;
    await onPage(page);

    cursor = page.length < EXPORT_PAGE_SIZE ? undefined : page.at(-1)?.id;
  } while (cursor);
}

async function collectDepartementSources(
  where: Prisma.RequeteWhereInput,
): Promise<{ codePostaux: string[]; sirecDepartementLibs: string[] }> {
  const codePostaux = new Set<string>();
  // Situations migrated from SIREC often have no postal code at all (RPPS or "autre" mis en
  // cause): their only geographic clue is the "département en charge" label SIREC carried.
  const sirecDepartementLibs = new Set<string>();

  await forEachRequetePage(where, departementSourceSelect, (page) => {
    for (const requete of page) {
      const candidates = [
        requete.declarant?.adresse?.codePostal,
        requete.participant?.adresse?.codePostal,
        ...requete.situations.flatMap((situation) => [
          situation.lieuDeSurvenue?.adresse?.codePostal || situation.lieuDeSurvenue?.codePostal,
          situation.misEnCause?.codePostal,
        ]),
      ];
      for (const codePostal of candidates) {
        if (codePostal) codePostaux.add(codePostal);
      }
      for (const situation of requete.situations) {
        const codePostalLieu = situation.lieuDeSurvenue?.adresse?.codePostal || situation.lieuDeSurvenue?.codePostal;
        if (!codePostalLieu && situation.sirecDepartement) sirecDepartementLibs.add(situation.sirecDepartement);
      }
    }
  });

  return { codePostaux: Array.from(codePostaux), sirecDepartementLibs: Array.from(sirecDepartementLibs) };
}

export async function prepareExportRequetesCsv(topEntiteId: string): Promise<ExportRequetesCsvWriter> {
  const entiteIds = (await getEntiteDescendantIds(topEntiteId)) ?? [];
  const where: Prisma.RequeteWhereInput = { requeteEntites: { some: { entiteId: { in: entiteIds } } } };

  const departmentReferences = await getDepartmentReferences(await collectDepartementSources(where));
  const options = { topEntiteId, ...departmentReferences };

  return async (write) => {
    await write(CSV_BOM + serializeCsvRow([...EXPORT_REQUETES_HEADERS]));

    await forEachRequetePage(where, exportRequetesSelect, async (page) => {
      const rows = buildExportRequetesRows(page.map(toExportRequeteRecord), options);
      await write(CSV_LINE_SEPARATOR + rows.map(serializeCsvRow).join(CSV_LINE_SEPARATOR));
    });
  };
}

async function getDepartmentReferences({
  codePostaux,
  sirecDepartementLibs,
}: {
  codePostaux: string[];
  sirecDepartementLibs: string[];
}): Promise<{
  departmentCodesByPostalCode: Map<string, string>;
  departementNamesByCode: Map<string, string>;
  departementCodesByName: Map<string, string>;
}> {
  const empty = {
    departmentCodesByPostalCode: new Map<string, string>(),
    departementNamesByCode: new Map<string, string>(),
    departementCodesByName: new Map<string, string>(),
  };

  if (codePostaux.length === 0 && sirecDepartementLibs.length === 0) {
    return empty;
  }

  const inseePostalRows =
    codePostaux.length > 0
      ? await prisma.inseePostal.findMany({
          where: { codePostal: { in: codePostaux } },
          select: { codePostal: true, commune: { select: { dptCodeActuel: true } } },
          distinct: ['codePostal'],
        })
      : [];
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

  // SIREC department labels are the INSEE ones, so Commune resolves them to a code.
  const communeFilters = [
    ...(departmentCodes.length > 0 ? [{ dptCodeActuel: { in: departmentCodes } }] : []),
    ...(sirecDepartementLibs.length > 0 ? [{ dptLibActuel: { in: sirecDepartementLibs } }] : []),
  ];

  if (communeFilters.length === 0) {
    return { ...empty, departmentCodesByPostalCode };
  }

  const communeRows = await prisma.commune.findMany({
    where: { OR: communeFilters },
    select: { dptCodeActuel: true, dptLibActuel: true },
    distinct: ['dptCodeActuel'],
  });

  return {
    departmentCodesByPostalCode,
    departementNamesByCode: new Map(communeRows.map((row) => [row.dptCodeActuel, row.dptLibActuel])),
    departementCodesByName: new Map(communeRows.map((row) => [row.dptLibActuel, row.dptCodeActuel])),
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
      sirecDepartement: situation.sirecDepartement,
      lieuDeSurvenue: situation.lieuDeSurvenue,
      misEnCause: situation.misEnCause,
      faits: situation.faits,
      domainesFonctionnels: situation.domainesFonctionnels,
      demarchesEngagees: situation.demarchesEngagees,
      situationEntites: situation.situationEntites,
    })),
  };
}
