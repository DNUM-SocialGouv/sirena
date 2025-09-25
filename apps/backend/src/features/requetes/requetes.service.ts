import { prisma } from '@/libs/prisma';
import { determineSource, generateRequeteId } from './functionalId.service';
import type { CreateRequeteFromDematSocialDto } from './requetes.type';

export const getRequeteByDematSocialId = async (id: number) =>
  await prisma.requete.findFirst({
    where: {
      dematSocialId: id,
    },
    include: {
      receptionType: true,
      etapes: { include: { statut: true } },
    },
  });

export const createRequeteFromDematSocial = async ({
  dematSocialId,
  receptionDate,
  receptionTypeId,
  declarant,
  participant,
  situations,
}: CreateRequeteFromDematSocialDto) => {
  // TODO remove that when we create assignation algo
  const defaultEntity = await prisma.entite.findFirst({
    where: {
      entiteMereId: null,
      label: 'ARS NORM',
    },
    select: { id: true },
  });

  return await prisma.$transaction(async (tx) => {
    const source = determineSource(dematSocialId);
    const id = await generateRequeteId(source);
    const requete = await tx.requete.create({
      data: {
        requeteEntites: {
          create: {
            // TODO remove that when we create assignation algo
            entite: { connect: { id: defaultEntity?.id } },
          },
        },
        id,
        dematSocialId,
        receptionDate,
        receptionType: { connect: { id: receptionTypeId } },
      },
    });

    const decl = await tx.personneConcernee.create({
      data: {
        identite: {
          create: {
            nom: declarant.nom ?? '',
            prenom: declarant.prenom ?? '',
            telephone: declarant.telephone ?? '',
            email: declarant.email ?? '',
            civilite: declarant.civiliteId ? { connect: { id: declarant.civiliteId } } : undefined,
          },
        },
        estHandicapee: declarant.estHandicapee ?? null,
        estVictime: declarant.estVictime ?? null,
        estAnonyme: declarant.estAnonyme ?? null,
        lienVictime: declarant.lienVictimeId ? { connect: { id: declarant.lienVictimeId } } : undefined,
        age: declarant.ageId ? { connect: { id: declarant.ageId } } : undefined,
        declarantDe: { connect: { id: requete.id } },
      },
    });

    if (declarant.adresse) {
      const a = declarant.adresse;
      await tx.adresse.create({
        data: {
          label: a.label ?? '',
          numero: a.numero ?? '',
          rue: a.rue ?? '',
          codePostal: a.codePostal ?? '',
          ville: a.ville ?? '',
          personneConcernee: { connect: { id: decl.id } },
        },
      });
    }

    if (participant) {
      const part = await tx.personneConcernee.create({
        data: {
          identite: {
            create: {
              telephone: participant.telephone ?? '',
            },
          },
          estHandicapee: participant.estHandicapee ?? null,
          estVictimeInformee: participant.estVictimeInformee ?? null,
          victimeInformeeCommentaire: participant.victimeInformeeCommentaire ?? '',
          autrePersonnes: participant.autrePersonnes ?? '',
          age: participant.ageId ? { connect: { id: participant.ageId } } : undefined,
          participantDe: { connect: { id: requete.id } },
        },
        select: { id: true },
      });

      if (participant.adresse) {
        const a = participant.adresse;
        await tx.adresse.create({
          data: {
            label: a.label ?? '',
            numero: a.numero ?? '',
            rue: a.rue ?? '',
            codePostal: a.codePostal ?? '',
            ville: a.ville ?? '',
            personneConcernee: { connect: { id: part.id } },
          },
        });
      }
    }

    for (const s of situations) {
      const lieu = await tx.lieuDeSurvenue.create({
        data: {
          codePostal: s.lieuDeSurvenue.codePostal ?? '',
          commentaire: s.lieuDeSurvenue.commentaire ?? '',
          societeTransport: s.lieuDeSurvenue.societeTransport ?? '',
          finess: s.lieuDeSurvenue.finess ?? '',
          lieuType: s.lieuDeSurvenue.lieuTypeId ? { connect: { id: s.lieuDeSurvenue.lieuTypeId } } : undefined,
          transportType: s.lieuDeSurvenue.transportTypeId
            ? { connect: { id: s.lieuDeSurvenue.transportTypeId } }
            : undefined,
        },
        select: { id: true },
      });

      if (s.lieuDeSurvenue.adresse) {
        const a = s.lieuDeSurvenue.adresse;
        await tx.adresse.create({
          data: {
            label: a.label ?? '',
            numero: a.numero ?? '',
            rue: a.rue ?? '',
            codePostal: a.codePostal ?? '',
            ville: a.ville ?? '',
            lieuDeSurvenue: { connect: { id: lieu.id } },
          },
        });
      }

      const mec = await tx.misEnCause.create({
        data: {
          rpps: s.misEnCause.rpps ?? null,
          commentaire: s.misEnCause.commentaire ?? '',
          misEnCauseType: s.misEnCause.misEnCauseTypeId
            ? { connect: { id: s.misEnCause.misEnCauseTypeId } }
            : undefined,
          professionType: s.misEnCause.professionTypeId
            ? { connect: { id: s.misEnCause.professionTypeId } }
            : undefined,
          professionDomicileType: s.misEnCause.professionDomicileTypeId
            ? { connect: { id: s.misEnCause.professionDomicileTypeId } }
            : undefined,
        },
        select: { id: true },
      });

      const atId = s.demarchesEngagees.autoriteTypeId ?? null;
      const autorite = atId
        ? await tx.autoriteTypeEnum.findUnique({ where: { id: atId }, select: { id: true } })
        : null;

      const demIds = s.demarchesEngagees.demarches?.map((id) => ({ id })) ?? [];

      const dem = await tx.demarchesEngagees.create({
        data: {
          dateContactEtablissement: s.demarchesEngagees.dateContactEtablissement ?? null,
          etablissementARepondu: s.demarchesEngagees.etablissementARepondu ?? null,
          organisme: s.demarchesEngagees.organisme ?? '',
          datePlainte: s.demarchesEngagees.datePlainte ?? null,
          autoriteType: autorite ? { connect: { id: autorite.id } } : undefined,
          demarches: demIds.length ? { connect: demIds } : undefined,
        },
      });

      const situation = await tx.situation.create({
        data: {
          requete: { connect: { id: requete.id } },
          lieuDeSurvenue: { connect: { id: lieu.id } },
          misEnCause: { connect: { id: mec.id } },
          demarchesEngagees: { connect: { id: dem.id } },
          situationEntites: {
            // TODO remove that when we create assignation algo
            create: { entiteId: defaultEntity?.id || '' },
          },
        },
        select: { id: true },
      });

      const faits = s.faits.map(async (f) => {
        await tx.fait.create({
          data: {
            situation: { connect: { id: situation.id } },
            dateDebut: f.dateDebut ?? null,
            dateFin: f.dateFin ?? null,
            commentaire: f.commentaire ?? '',
          },
        });

        if (f.motifs?.length) {
          await tx.faitMotif.createMany({
            data: f.motifs.map((motifId) => ({
              situationId: situation.id,
              motifId,
            })),
            skipDuplicates: true,
          });
        }

        if (f.consequences?.length) {
          await tx.faitConsequence.createMany({
            data: f.consequences.map((consequenceId) => ({
              situationId: situation.id,
              consequenceId,
            })),
            skipDuplicates: true,
          });
        }

        if (f.maltraitanceTypes?.length) {
          await tx.faitMaltraitanceType.createMany({
            data: f.maltraitanceTypes.map((maltraitanceTypeId) => ({
              situationId: situation.id,
              maltraitanceTypeId,
            })),
            skipDuplicates: true,
          });
        }
      });

      await Promise.all(faits);
    }

    return await tx.requete.findUniqueOrThrow({
      where: { id: requete.id },
      include: {
        declarant: { include: { adresse: true, age: true, lienVictime: true } },
        participant: { include: { adresse: true, age: true } },
        situations: {
          include: {
            lieuDeSurvenue: { include: { adresse: true, lieuType: true, transportType: true } },
            misEnCause: { include: { misEnCauseType: true, professionType: true, professionDomicileType: true } },
            demarchesEngagees: { include: { autoriteType: true, demarches: true } },
            faits: {
              include: {
                motifs: { include: { motif: true } },
                consequences: { include: { consequence: true } },
                maltraitanceTypes: { include: { maltraitanceType: true } },
              },
            },
          },
        },
      },
    });
  });
};

export const createOrGetFromDematSocial = async (dto: CreateRequeteFromDematSocialDto) => {
  const requete = await getRequeteByDematSocialId(dto.dematSocialId);

  if (requete) {
    return null;
  }

  return await createRequeteFromDematSocial(dto);
};
