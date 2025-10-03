import { mappers } from '@sirena/common';
import type { DeclarantDataSchema } from '@sirena/common/schemas';
import type { z } from 'zod';

type DeclarantInput = z.infer<typeof DeclarantDataSchema>;

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
