import { type Prisma, prisma } from '../../../libs/prisma.js';
import { getEntiteDescendantIds } from '../../entites/entites.service.js';
import { buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';
import type { ExportRequeteRecord } from './exportRequetesRows.js';

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
      entite: { select: { label: true, nomComplet: true, entiteTypeId: true } },
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
    select: exportRequetesSelect,
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
