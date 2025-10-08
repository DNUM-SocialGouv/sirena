import { mappers } from '@sirena/common';
import type { DeclarantDataSchema, PersonneConcerneeDataSchema } from '@sirena/common/schemas';
import type { z } from 'zod';

type DeclarantInput = z.infer<typeof DeclarantDataSchema>;
type PersonneConcerneeInput = z.infer<typeof PersonneConcerneeDataSchema>;

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
          create: {
            label: declarantData.adresseDomicile || '',
            codePostal: declarantData.codePostal || '',
            ville: declarantData.ville || '',
          },
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
          create: {
            label: participantData.adresseDomicile || '',
            codePostal: participantData.codePostal || '',
            ville: participantData.ville || '',
          },
        }
      : undefined,
});
