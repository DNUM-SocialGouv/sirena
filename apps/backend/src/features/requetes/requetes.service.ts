import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { sanitizeFilename, urlToStream } from '@/helpers/file';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import { uploadFileToMinio } from '@/libs/minio';
import { prisma } from '@/libs/prisma';
import { determineSource, generateRequeteId } from './functionalId.service';
import type { CreateRequeteFromDematSocialDto, ElementLinked, File } from './requetes.type';

export const getRequeteByDematSocialId = async (id: number) =>
  await prisma.requete.findFirst({
    where: {
      dematSocialId: id,
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
  const logger = getLoggerStore();
  const defaultEntity = await prisma.entite.findFirst({
    where: {
      entiteMereId: null,
      label: 'ARS NORM',
    },
    select: { id: true },
  });

  return await prisma.$transaction(async (tx) => {
    const createFileForRequete = async (file: File, element: ElementLinked, entiteId: string | null) => {
      const { stream, mimeFromHeader, mimeSniffed, size, extSniffed } = await urlToStream(file.url);

      const mimeType = mimeSniffed ?? mimeFromHeader ?? 'application/octet-stream';
      const ext = extSniffed ?? file.name.split('.').pop() ?? '';

      const filename = sanitizeFilename(file.name, ext);

      const { objectPath, rollback: rollbackMinio } = await uploadFileToMinio(stream, filename, mimeType);

      const fileName = objectPath.split('/')?.[1] || '';
      const id = fileName.split('.')?.[0] || '';

      return tx.uploadedFile
        .create({
          data: {
            id,
            fileName,
            filePath: objectPath,
            mimeType,
            size: size ?? 0,
            metadata: { originalName: file.name },
            entiteId,
            uploadedById: null,
            requeteEtapeNoteId: null,
            requeteId: null,
            demarchesEngageesId: element.demarchesEngageesId ?? null,
            faitSituationId: element.faitSituationId ?? null,
            status: 'COMPLETED',
          },
        })
        .catch(async (err) => {
          await rollbackMinio();
          throw err;
        });
    };

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
        veutGarderAnonymat: declarant.veutGarderAnonymat ?? null,
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
              nom: participant.nom ?? '',
              prenom: participant.prenom ?? '',
              email: participant.email ?? '',
              telephone: participant.telephone ?? '',
              civilite: participant.civiliteId ? { connect: { id: participant.civiliteId } } : undefined,
            },
          },
          estHandicapee: participant.estHandicapee ?? null,
          estVictimeInformee: participant.estVictimeInformee ?? null,
          victimeInformeeCommentaire: participant.victimeInformeeCommentaire ?? '',
          veutGarderAnonymat: participant.veutGarderAnonymat ?? null,
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

      const misEnCauseData: {
        rpps: string | null;
        commentaire: string;
        misEnCauseTypeId?: string | null;
        misEnCauseTypePrecisionId?: string | null;
      } = {
        rpps: s.misEnCause.rpps ?? null,
        commentaire: s.misEnCause.commentaire ?? '',
      };

      if (s.misEnCause.misEnCauseTypeId) {
        misEnCauseData.misEnCauseTypeId = s.misEnCause.misEnCauseTypeId;
      }

      if (s.misEnCause.professionTypeId || s.misEnCause.professionDomicileTypeId) {
        misEnCauseData.misEnCauseTypePrecisionId =
          s.misEnCause.professionTypeId || s.misEnCause.professionDomicileTypeId;
      }

      const mec = await tx.misEnCause.create({
        data: misEnCauseData,
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

      const files = s.demarchesEngagees.files.map(
        async (file) => await createFileForRequete(file, { demarchesEngageesId: dem.id }, defaultEntity?.id ?? null),
      );

      const results = await Promise.allSettled(files);
      results.forEach((result) => {
        if (result.status === 'rejected') {
          logger.error(
            { err: result.reason },
            `Uploaded files to s3 encountred an error on requete: ${requete.id}, dematSocialId: ${dematSocialId}`,
          );
        }
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

        const files = f.files.map(
          async (file) =>
            await createFileForRequete(file, { faitSituationId: situation.id }, defaultEntity?.id ?? null),
        );

        const results = await Promise.allSettled(files);
        results.forEach((result) => {
          if (result.status === 'rejected') {
            logger.error(
              { err: result.reason },
              `Uploaded files to s3 encountred an error on requete: ${requete.id}, dematSocialId: ${dematSocialId}`,
            );
          }
        });

        if (f.motifs?.length) {
          await tx.faitMotifDeclaratif.createMany({
            data: f.motifs.map((motifId) => ({
              situationId: situation.id,
              motifDeclaratifId: motifId,
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

    const requeteWithEntites = await tx.requete.findUniqueOrThrow({
      where: { id: requete.id },
      include: { requeteEntites: true },
    });

    for (const entite of requeteWithEntites.requeteEntites) {
      await tx.requeteEtape.create({
        data: {
          requeteId: requete.id,
          entiteId: entite.entiteId,
          statutId: REQUETE_STATUT_TYPES.FAIT,
          nom: `Création de la requête le ${receptionDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}`,
        },
      });

      await tx.requeteEtape.create({
        data: {
          requeteId: requete.id,
          entiteId: entite.entiteId,
          statutId: REQUETE_STATUT_TYPES.A_FAIRE,
          nom: 'Envoyer un accusé de réception au déclarant',
        },
      });
    }

    return await tx.requete.findUniqueOrThrow({
      where: { id: requete.id },
      include: {
        declarant: { include: { adresse: true, age: true, lienVictime: true } },
        participant: { include: { adresse: true, age: true } },
        situations: {
          include: {
            lieuDeSurvenue: { include: { adresse: true, lieuType: true, transportType: true } },
            misEnCause: {
              include: {
                misEnCauseType: true,
                misEnCauseTypePrecision: {
                  include: {
                    misEnCauseType: true,
                  },
                },
              },
            },
            demarchesEngagees: { include: { autoriteType: true, demarches: true } },
            faits: {
              include: {
                motifs: { include: { motif: true } },
                motifsDeclaratifs: { include: { motifDeclaratif: true } },
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
