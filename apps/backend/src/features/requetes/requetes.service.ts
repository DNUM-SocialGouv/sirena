import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { prisma } from '@/libs/prisma';
import type { CreateRequeteFromDematSocialDto } from './requetes.type';

export const getRequeteByDematSocialId = async (id: number) =>
  await prisma.requete.findFirst({
    where: {
      dematSocialId: id,
    },
  });

export const createRequeteFromDematSocial = async ({ dematSocialId, createdAt }: CreateRequeteFromDematSocialDto) => {
  return await prisma.requete.create({
    data: {
      dematSocialId: dematSocialId,
      createdAt, // Date depot
      requetesEntite: {
        create: {
          requetesEntiteStates: {
            create: {
              statutId: REQUETE_STATUT_TYPES.A_QUALIFIER,
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

export const createOrGetFromDematSocial = async ({ dematSocialId, createdAt }: CreateRequeteFromDematSocialDto) => {
  const requete = await getRequeteByDematSocialId(dematSocialId);

  if (requete) {
    return null;
  }

  return await createRequeteFromDematSocial({ dematSocialId, createdAt });
};
