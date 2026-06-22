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
    include: {
      clotureReason: true,
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
        include: {
          adresse: true,
          lieuType: true,
          transportType: true,
        },
      },
      misEnCause: {
        include: {
          misEnCauseType: true,
          misEnCauseTypePrecision: true,
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

  return buildExportRequetesCsvFromRecords(requetes.map(toExportRequeteRecord), { topEntiteId });
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
    })),
  };
}
