import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { prisma } from '@/libs/prisma';
import type { CreateRequeteFromDematSocialDto } from './requetes.type';

export const createRequeteFromDematSocial = async ({ dematSocialId, createdAt }: CreateRequeteFromDematSocialDto) => {
  return prisma.$transaction(async (tx) => {
    const requete = await tx.requete.create({
      data: {
        dematSocialId,
        createdAt,
        requetesEntite: { create: {} },
      },
      include: { requetesEntite: true },
    });

    for (const entite of requete.requetesEntite) {
      await tx.requeteState.create({
        data: {
          requeteEntiteId: entite.id,
          statutId: REQUETE_STATUT_TYPES.FAIT,
          stepName: `Création de la requête le ${createdAt.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}`,
          infoComplementaire: {
            create: { receptionDate: new Date(), receptionTypeId: RECEPTION_TYPES.FORMULAIRE },
          },
        },
      });

      await tx.requeteState.create({
        data: {
          requeteEntiteId: entite.id,
          statutId: REQUETE_STATUT_TYPES.A_FAIRE,
          stepName: 'Envoyer un accuser de réception au déclarant',
          infoComplementaire: {
            create: { receptionDate: new Date(), receptionTypeId: RECEPTION_TYPES.FORMULAIRE },
          },
        },
      });
    }

    return requete;
  });
};
