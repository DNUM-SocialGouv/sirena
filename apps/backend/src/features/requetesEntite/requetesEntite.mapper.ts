import { mappers } from '@sirena/common';
import type { DeclarantDataSchema, PersonneConcerneeDataSchema, SituationDataSchema } from '@sirena/common/schemas';
import type { z } from 'zod';
import { parseAdresseDomicile } from '@/helpers/address';

type DeclarantInput = z.infer<typeof DeclarantDataSchema>;
type PersonneConcerneeInput = z.infer<typeof PersonneConcerneeDataSchema>;
type SituationInput = z.infer<typeof SituationDataSchema>;

export const mapDeclarantToPrismaCreate = (declarantData: DeclarantInput) => ({
  estIdentifie: true,
  veutGarderAnonymat: declarantData.neSouhaitePasCommuniquerIdentite || false,
  estVictime: declarantData.estPersonneConcernee || false,
  commentaire: declarantData.autresPrecisions || '',
  lienVictimeId:
    declarantData.lienAvecPersonneConcernee &&
    declarantData.lienAvecPersonneConcernee !== '' &&
    declarantData.lienAvecPersonneConcernee !== 'AUTRE'
      ? declarantData.lienAvecPersonneConcernee
      : undefined,
  lienAutrePrecision: declarantData.lienAvecPersonneConcerneePrecision || undefined,
  identite: {
    create: {
      nom: declarantData.nom || '',
      prenom: declarantData.prenom || '',
      email: declarantData.courrierElectronique || '',
      telephone: declarantData.numeroTelephone || '',
      civiliteId: mappers.mapCiviliteToDatabase(declarantData.civilite),
    },
  },
  adresse:
    declarantData.adresseDomicile || declarantData.codePostal || declarantData.ville
      ? {
          create: (() => {
            const { numero, rue } = parseAdresseDomicile(declarantData.adresseDomicile || '');
            return {
              label:
                `${declarantData.adresseDomicile || ''} ${declarantData.codePostal || ''} ${declarantData.ville || ''}` ||
                '',
              numero,
              rue,
              codePostal: declarantData.codePostal || '',
              ville: declarantData.ville || '',
            };
          })(),
        }
      : undefined,
});

export const mapPersonneConcerneeToPrismaCreate = (participantData: PersonneConcerneeInput) => ({
  estHandicapee: participantData.estHandicapee || false,
  veutGarderAnonymat: participantData.veutGarderAnonymat || false,
  estVictimeInformee: participantData.estVictimeInformee || false,
  autrePersonnes: participantData.autrePersonnes || '',
  commentaire: participantData.commentaire || '',
  ageId: participantData.age || undefined,
  identite: {
    create: {
      nom: participantData.nom || '',
      prenom: participantData.prenom || '',
      email: participantData.courrierElectronique || '',
      telephone: participantData.numeroTelephone || '',
      civiliteId: mappers.mapCiviliteToDatabase(participantData.civilite),
    },
  },
  adresse:
    participantData.adresseDomicile || participantData.codePostal || participantData.ville
      ? {
          create: (() => {
            const { numero, rue } = parseAdresseDomicile(participantData.adresseDomicile || '');
            return {
              label:
                `${participantData.adresseDomicile || ''} ${participantData.codePostal || ''} ${participantData.ville || ''}` ||
                '',
              numero,
              rue,
              codePostal: participantData.codePostal || '',
              ville: participantData.ville || '',
            };
          })(),
        }
      : undefined,
});

export const mapSituationToPrismaCreate = (situationData: SituationInput) => {
  const lieuData = situationData.lieuDeSurvenue;
  const misEnCauseData = situationData.misEnCause;
  const demarchesData = situationData.demarchesEngagees;

  const hasAdresse = lieuData?.adresse || lieuData?.codePostal;

  return {
    lieuDeSurvenue: {
      create: {
        lieuTypeId: lieuData?.lieuType || null,
        lieuPrecision: lieuData?.lieuPrecision || '',
        codePostal: lieuData?.codePostal || '',
        societeTransport: lieuData?.societeTransport || '',
        finess: lieuData?.finess || '',
        adresse: hasAdresse
          ? {
              create: {
                label: lieuData?.adresse || '',
                codePostal: lieuData?.codePostal || '',
              },
            }
          : undefined,
      },
    },
    misEnCause: {
      create: {
        misEnCauseTypeId:
          misEnCauseData?.misEnCauseType && misEnCauseData.misEnCauseType !== '' ? misEnCauseData.misEnCauseType : null,
        misEnCauseTypePrecisionId:
          misEnCauseData?.misEnCausePrecision && misEnCauseData.misEnCausePrecision !== ''
            ? misEnCauseData.misEnCausePrecision
            : null,
        rpps: misEnCauseData?.rpps || null,
        commentaire: misEnCauseData?.commentaire || '',
      },
    },
    demarchesEngagees: {
      create: {
        dateContactEtablissement: demarchesData?.dateContactResponsables
          ? new Date(demarchesData.dateContactResponsables)
          : null,
        etablissementARepondu: demarchesData?.reponseRecueResponsables ?? null,
        organisme: demarchesData?.precisionsOrganisme || '',
        datePlainte: demarchesData?.dateDepotPlainte ? new Date(demarchesData.dateDepotPlainte) : null,
        autoriteTypeId: demarchesData?.lieuDepotPlainte || null,
        demarches: demarchesData?.demarches?.length
          ? {
              connect: demarchesData.demarches.map((demarcheId) => ({ id: demarcheId })),
            }
          : undefined,
      },
    },
  };
};

export const mapSituationFaitToPrismaCreate = (situationId: string, faitData?: SituationInput['fait']) => {
  if (!faitData) return undefined;

  return {
    situationId,
    dateDebut: faitData.dateDebut ? new Date(faitData.dateDebut) : null,
    dateFin: faitData.dateFin ? new Date(faitData.dateFin) : null,
    commentaire: faitData.commentaire || '',
    autresPrecisions: faitData.autresPrecisions || '',
    motifs: faitData.sousMotifs?.length
      ? {
          create: faitData.sousMotifs.map((sousMotifLabel) => ({
            motif: {
              connectOrCreate: {
                where: { label: sousMotifLabel },
                create: { label: sousMotifLabel },
              },
            },
          })),
        }
      : undefined,
    consequences: faitData.consequences?.length
      ? {
          create: faitData.consequences.map((consequenceId) => ({
            consequence: {
              connect: { id: consequenceId },
            },
          })),
        }
      : undefined,
  };
};
