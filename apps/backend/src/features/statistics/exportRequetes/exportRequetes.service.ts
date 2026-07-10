import { type Prisma, prisma } from '../../../libs/prisma.js';
import { getEntiteDescendantIds } from '../../entites/entites.service.js';
import { buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';
import type { ExportRequeteRecord } from './exportRequetesRows.js';

const exportRequetesInclude = {
  declarant: {
    include: {
      adresse: true,
      lienVictime: true,
    },
  },
  participant: {
    include: {
      adresse: true,
      age: true,
      identite: {
        include: {
          civilite: true,
        },
      },
    },
  },
  provenance: true,
  receptionType: true,
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
    include: {
      entite: true,
      priorite: true,
      statut: true,
    },
  },
  situations: {
    include: {
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
        include: {
          motifs: {
            include: {
              motif: true,
            },
          },
          motifsDeclaratifs: {
            include: {
              motifDeclaratif: true,
            },
          },
          consequences: {
            include: {
              consequence: true,
            },
          },
        },
      },
      domainesFonctionnels: true,
      demarchesEngagees: {
        include: {
          autoriteType: true,
          demarches: true,
        },
      },
      situationEntites: {
        include: {
          entite: {
            include: {
              entiteMere: {
                include: {
                  entiteMere: true,
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RequeteInclude;

type ExportRequetePrismaPayload = Prisma.RequeteGetPayload<{
  include: typeof exportRequetesInclude;
}>;

export async function generateExportRequetesCsv(topEntiteId: string): Promise<string> {
  const entiteIds = await getEntiteDescendantIds(topEntiteId);
  const requetes = await prisma.requete.findMany({
    where: {
      requeteEntites: {
        some: {
          entiteId: { in: entiteIds ?? [] },
        },
      },
    },
    include: exportRequetesInclude,
  });
  const { departmentCodesByPostalCode, departementNamesByCode } = await getDepartmentReferences(requetes);

  return buildExportRequetesCsvFromRecords(requetes.map(toExportRequeteRecord), {
    topEntiteId,
    departmentCodesByPostalCode,
    departementNamesByCode,
  });
}

async function getDepartmentReferences(requetes: ExportRequetePrismaPayload[]): Promise<{
  departmentCodesByPostalCode: Map<string, string>;
  departementNamesByCode: Map<string, string>;
}> {
  const codePostaux = Array.from(
    new Set(
      requetes
        .flatMap((requete) => [
          requete.declarant?.adresse?.codePostal,
          requete.participant?.adresse?.codePostal,
          ...requete.situations.flatMap((situation) => [
            situation.lieuDeSurvenue?.adresse?.codePostal || situation.lieuDeSurvenue?.codePostal,
            situation.misEnCause?.codePostal,
          ]),
        ])
        .filter((codePostal): codePostal is string => !!codePostal),
    ),
  );

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
      codePostaux.map((codePostal) => departmentCodesByPostalCode.get(codePostal) ?? extractDepartmentCode(codePostal)),
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

function extractDepartmentCode(codePostal: string): string {
  if (!/^\d{5}$/.test(codePostal)) {
    return '';
  }

  if (codePostal.startsWith('20')) {
    return '20';
  }

  if (codePostal.startsWith('97') || codePostal.startsWith('98')) {
    return codePostal.slice(0, 3);
  }

  return codePostal.slice(0, 2);
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
