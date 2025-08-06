import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { prisma } from '@/libs/prisma';
import type { CreateRequeteFromDematSocialDto } from './requetes.type';

export const createRequeteFromDematSocial = async ({ dematSocialId, createdAt }: CreateRequeteFromDematSocialDto) => {
  return await prisma.requete.create({
    data: {
      dematSocialId: dematSocialId,
      createdAt, // Date depot
      requetesEntite: {
        create: {
          requetesEntiteStates: {
            create: {
              statutId: REQUETE_STATUT_TYPES.FAIT,
              stepName: `Création de la requête le ${createdAt.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}`,
              infoComplementaire: {
                create: {
                  receptionDate: new Date(),
                  receptionTypeId: RECEPTION_TYPES.FORUMULAIRE,
                },
              },
            },
          },
        },
      },
    },
  });
};
