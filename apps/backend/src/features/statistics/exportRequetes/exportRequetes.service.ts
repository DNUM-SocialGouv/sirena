import {
  addDaysToIsoDate,
  CSV_BOM,
  CSV_LINE_SEPARATOR,
  getStartOfDayInTimeZone,
  serializeCsvRow,
} from '@sirena/common/utils';
import type { ChunkWriter } from '../../../helpers/stream.js';
import { type Prisma, prisma } from '../../../libs/prisma.js';
import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import { deriveDepartmentCodeFromPostalCode } from './exportRequetesFormatters.js';
import { buildExportRequetesRows, type ExportRequeteRecord } from './exportRequetesRows.js';

export type ExportRequetesParams = {
  topEntiteId: string;
  // Calendar days (YYYY-MM-DD) in Europe/Paris, both included.
  startDate: string;
  endDate: string;
  // Steps another entity shares with the user's entity, readable when the feature flag is on.
  includeSharedEtapes?: boolean;
};

const fileNameSelect = { select: { fileName: true, metadata: true } } as const;

const identiteSelect = {
  select: {
    civilite: { select: { label: true } },
    nom: true,
    prenom: true,
    email: true,
    telephone: true,
  },
} as const;

const adresseSelect = { select: { codePostal: true, ville: true, numero: true, rue: true } } as const;

const buildExportRequetesSelect = ({ topEntiteId, includeSharedEtapes }: ExportRequetesParams) =>
  ({
    id: true,
    createdAt: true,
    receptionDate: true,
    dateDemandeDeclarant: true,
    provenancePrecision: true,
    dematSocialId: true,
    sirecId: true,
    fichiersRequeteOriginale: fileNameSelect,
    declarant: {
      select: {
        estVictime: true,
        lienVictime: { select: { label: true } },
        lienAutrePrecision: true,
        isTuteur: true,
        identite: identiteSelect,
        adresse: adresseSelect,
        veutGarderAnonymat: true,
        estSignalementProfessionnel: true,
        commentaire: true,
      },
    },
    participant: {
      select: {
        identite: identiteSelect,
        age: { select: { label: true } },
        dateNaissance: true,
        adresse: adresseSelect,
        veutGarderAnonymat: true,
        estVictimeInformee: true,
        victimeInformeeCommentaire: true,
        mesureProtection: true,
        estHandicapee: true,
        aAutrePersonnes: true,
        autrePersonnes: true,
        commentaire: true,
      },
    },
    provenance: { select: { label: true } },
    receptionType: { select: { label: true } },
    etapes: {
      // Same reading rule as the processing steps screen (requeteEtapeAuthorization.canRead).
      where: includeSharedEtapes
        ? { OR: [{ entiteId: topEntiteId }, { estPartagee: true }] }
        : { entiteId: topEntiteId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        entiteId: true,
        nom: true,
        type: true,
        statutId: true,
        statut: { select: { label: true } },
        createdAt: true,
        dateRealisation: true,
        clotureEffectiveDate: true,
        clotureReason: { select: { label: true } },
        uploadedFiles: fileNameSelect,
        notes: {
          orderBy: { createdAt: 'asc' },
          select: { texte: true, createdAt: true, author: { select: { prenom: true, nom: true } } },
        },
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
        estLieAuSignalement: true,
        numerosSignalement: true,
        lieuDeSurvenue: {
          select: {
            lieuTypeId: true,
            lieuPrecision: true,
            codePostal: true,
            finess: true,
            societeTransport: true,
            categLib: true,
            adresse: { select: { codePostal: true, ville: true, numero: true, rue: true, label: true } },
            lieuType: { select: { label: true } },
            transportType: { select: { label: true } },
          },
        },
        misEnCause: {
          select: {
            civilite: true,
            nom: true,
            prenom: true,
            rpps: true,
            nomService: true,
            finess: true,
            codePostal: true,
            ville: true,
            autrePrecision: true,
            commentaire: true,
            misEnCauseType: { select: { label: true } },
            misEnCauseTypePrecision: { select: { label: true } },
          },
        },
        faits: {
          select: {
            dateDebut: true,
            dateFin: true,
            commentaire: true,
            autresPrecisions: true,
            motifs: { select: { motifId: true, motif: { select: { label: true } } } },
            motifsDeclaratifs: { select: { motifDeclaratif: { select: { label: true } } } },
            consequences: { select: { consequence: { select: { label: true } } } },
            maltraitanceTypes: { select: { maltraitanceTypeId: true, maltraitanceType: { select: { label: true } } } },
            fichiers: fileNameSelect,
          },
        },
        domainesFonctionnels: { select: { label: true } },
        demarchesEngagees: {
          select: {
            dateContactEtablissement: true,
            etablissementARepondu: true,
            organisme: true,
            datePlainte: true,
            commentaire: true,
            autoriteType: { select: { label: true } },
            demarches: { select: { label: true } },
            etablissementReponse: fileNameSelect,
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
  }) satisfies Prisma.RequeteSelect;

type ExportRequetePrismaPayload = Prisma.RequeteGetPayload<{
  select: ReturnType<typeof buildExportRequetesSelect>;
}>;

const EXPORT_PAGE_SIZE = 500;

export type ExportRequetesCsvWriter = (write: ChunkWriter) => Promise<number>;

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
    // Keyset on `id > cursor` rather than Prisma's `cursor` option, which returns an empty page
    // when the cursor row has been deleted meanwhile and would silently cut the export short.
    const page = (await prisma.requete.findMany({
      where: cursor ? { AND: [where, { id: { gt: cursor } }] } : where,
      select,
      orderBy: { id: 'asc' },
      take: EXPORT_PAGE_SIZE,
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
      for (const codePostal of [requete.declarant?.adresse?.codePostal, requete.participant?.adresse?.codePostal]) {
        if (codePostal) codePostaux.add(codePostal);
      }

      // Une seule passe sur les situations : le code postal du lieu sert deux fois — comme
      // code postal à résoudre, et comme test de l'absence qui fait retomber sur le libellé
      // SIREC — et le recalculer dans une seconde boucle laissait les deux dériver.
      for (const situation of requete.situations) {
        const codePostalLieu = situation.lieuDeSurvenue?.adresse?.codePostal || situation.lieuDeSurvenue?.codePostal;
        if (codePostalLieu) codePostaux.add(codePostalLieu);
        if (situation.misEnCause?.codePostal) codePostaux.add(situation.misEnCause.codePostal);
        if (!codePostalLieu && situation.sirecDepartement) sirecDepartementLibs.add(situation.sirecDepartement);
      }
    }
  });

  return { codePostaux: Array.from(codePostaux), sirecDepartementLibs: Array.from(sirecDepartementLibs) };
}

/**
 * Requêtes assigned to the user's root entity and created during the period. Same perimeter as
 * the requêtes list and hasAccessToRequete: the user can open every exported requête. Both bounds
 * are calendar days in Paris and are included.
 */
function buildExportRequetesWhere({
  topEntiteId,
  startDate,
  endDate,
}: Pick<ExportRequetesParams, 'topEntiteId' | 'startDate' | 'endDate'>): Prisma.RequeteWhereInput {
  return {
    requeteEntites: { some: { entiteId: topEntiteId } },
    createdAt: {
      gte: getStartOfDayInTimeZone(startDate),
      lt: getStartOfDayInTimeZone(addDaysToIsoDate(endDate, 1)),
    },
  };
}

export async function countExportRequetes(
  params: Pick<ExportRequetesParams, 'topEntiteId' | 'startDate' | 'endDate'>,
): Promise<number> {
  return prisma.requete.count({ where: buildExportRequetesWhere(params) });
}

/** Returns a writer that streams the CSV document and resolves with the number of data rows. */
export async function prepareExportRequetesCsv(params: ExportRequetesParams): Promise<ExportRequetesCsvWriter> {
  const where = buildExportRequetesWhere(params);
  const select = buildExportRequetesSelect(params);

  const departmentReferences = await getDepartmentReferences(await collectDepartementSources(where));
  const options = { topEntiteId: params.topEntiteId, ...departmentReferences };

  return async (write) => {
    let rowCount = 0;
    await write(CSV_BOM + serializeCsvRow([...EXPORT_REQUETES_HEADERS]));

    await forEachRequetePage(where, select, async (page) => {
      const rows = buildExportRequetesRows(page.map(toExportRequeteRecord), options);
      rowCount += rows.length;
      await write(CSV_LINE_SEPARATOR + rows.map(serializeCsvRow).join(CSV_LINE_SEPARATOR));
    });

    return rowCount;
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

  // GROUP BY so Postgres returns one row per department: Commune holds ~36 000 rows for 101 of
  // them, and `distinct` would read them all before deduplicating client-side.
  const communeRows = await prisma.commune.groupBy({
    by: ['dptCodeActuel', 'dptLibActuel'],
    where: { OR: communeFilters },
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
    provenancePrecision: requete.provenancePrecision,
    dematSocialId: requete.dematSocialId,
    sirecId: requete.sirecId,
    fichiersRequeteOriginale: requete.fichiersRequeteOriginale,
    declarant: requete.declarant,
    participant: requete.participant,
    requeteEntites: requete.requeteEntites,
    etapes: requete.etapes,
    situations: requete.situations.map((situation) => ({
      sirecDepartement: situation.sirecDepartement,
      estLieAuSignalement: situation.estLieAuSignalement,
      numerosSignalement: situation.numerosSignalement,
      lieuDeSurvenue: situation.lieuDeSurvenue,
      misEnCause: situation.misEnCause,
      faits: situation.faits,
      domainesFonctionnels: situation.domainesFonctionnels,
      demarchesEngagees: situation.demarchesEngagees,
      situationEntites: situation.situationEntites,
    })),
  };
}
