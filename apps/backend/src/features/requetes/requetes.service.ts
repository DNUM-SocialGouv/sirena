import { RECEPTION_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { prisma } from '@/libs/prisma';
import type { CreateRequeteFromDematSocialDto, CreateRequeteFromDematSocialMinimalDto } from './requetes.type';

export const getRequeteByDematSocialId = async (id: number) =>
  await prisma.requete.findFirst({
    where: {
      dematSocialId: id,
    },
    include: {
      receptionType: true,
      RequeteEntites: { include: { entite: true } },
      etapes: { include: { statut: true } },
    },
  });

export const createRequeteFromDematSocial = async ({
  dematSocialId,
  createdAt,
  entiteIds,
  receptionTypeId,
  receptionDate,
  commentaire,
}: CreateRequeteFromDematSocialDto) => {
  if (!entiteIds?.length) {
    throw new Error('createRequeteFromDematSocial: entiteIds is required (>= 1)');
  }

  return prisma.$transaction(async (tx) => {
    const requete = await tx.requete.create({
      data: {
        dematSocialId,
        commentaire,
        receptionDate,
        receptionTypeId,
        createdAt,
      },
    });

    for (const entiteId of entiteIds) {
      // create requeteEntite if not exists
      await tx.requeteEntite.upsert({
        where: { requeteId_entiteId: { requeteId: requete.id, entiteId: entiteId } },
        create: { requeteId: requete.id, entiteId: entiteId },
        update: {},
      });

      await tx.requeteEtape.create({
        data: {
          nom: `Création de la requête le ${createdAt.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}`,
          statutId: REQUETE_STATUT_TYPES.FAIT,
          requeteId: requete.id,
          entiteId,
        },
      });

      await tx.requeteEtape.create({
        data: {
          nom: 'Envoyer un accusé de réception au déclarant',
          statutId: REQUETE_STATUT_TYPES.A_FAIRE,
          requeteId: requete.id,
          entiteId,
        },
      });
    }

    return requete;
  });
};

export const createOrGetFromDematSocial = async (
  dto: CreateRequeteFromDematSocialMinimalDto,
  ctx: {
    userEntiteId: string;
  },
) => {
  const requete = await getRequeteByDematSocialId(dto.dematSocialId);

  if (requete) {
    return null;
  }

  const entiteIds = dto.entiteIds?.length ? dto.entiteIds : [ctx.userEntiteId];
  const receptionTypeId = dto.receptionTypeId ?? RECEPTION_TYPES.FORMULAIRE;
  const receptionDate = dto.receptionDate ?? new Date();
  const commentaire = dto.commentaire ?? '';

  return await createRequeteFromDematSocial({
    dematSocialId: dto.dematSocialId,
    createdAt: dto.createdAt,
    entiteIds,
    receptionTypeId,
    receptionDate,
    commentaire,
  });
};
