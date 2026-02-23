import { addFileProcessingJob } from '../../../jobs/queues/fileProcessing.queue.js';
import { getLoggerStore } from '../../../libs/asyncLocalStorage.js';
import { uploadFileToMinio } from '../../../libs/minio.js';
import { prisma } from '../../../libs/prisma.js';
import { generateRequeteId } from '../../requetes/functionalId.service.js';
import type { CreateRequeteFromThirdPartyDto } from './requetes.type.js';

export const createRequeteFromThirdParty = async ({
  thirdPartyAccountId,
  receptionDate,
  receptionTypeId,
  declarant,
  victime,
  situations,
}: CreateRequeteFromThirdPartyDto) => {
  return await prisma.$transaction(async (tx) => {
    const id = await generateRequeteId('TELEPHONIQUE', tx);
    const requete = await tx.requete.create({
      data: {
        id,
        receptionDate,
        receptionType: { connect: { id: receptionTypeId } },
        thirdPartyAccount: { connect: { id: thirdPartyAccountId } },
      },
    });

    const decl = await tx.personneConcernee.create({
      data: {
        identite: {
          create: {
            nom: declarant.nom,
            prenom: declarant.prenom,
            telephone: declarant.telephone ?? '',
            email: declarant.email ?? '',
            civilite: declarant.civiliteId ? { connect: { id: declarant.civiliteId } } : undefined,
          },
        },
        commentaire: declarant.commentaire ?? '',
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

    if (victime) {
      const part = await tx.personneConcernee.create({
        data: {
          identite: {
            create: {
              nom: victime.nom,
              prenom: victime.prenom,
              email: victime.email ?? '',
              telephone: victime.telephone ?? '',
              civilite: victime.civiliteId ? { connect: { id: victime.civiliteId } } : undefined,
            },
          },
          commentaire: victime.commentaire ?? '',
          estHandicapee: victime.estHandicapee ?? null,
          veutGarderAnonymat: victime.veutGarderAnonymat ?? null,
          estVictimeInformee: victime.estVictimeInformee ?? null,
          autrePersonnes: victime.autrePersonnes ?? '',
          aAutrePersonnes: victime.autrePersonnes != null ? true : null,
          age: victime.ageId ? { connect: { id: victime.ageId } } : undefined,
          participantDe: { connect: { id: requete.id } },
        },
        select: { id: true },
      });

      if (victime.adresse) {
        const a = victime.adresse;
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
      const lieuDeSurvenue = s.lieuDeSurvenue;
      const lieu = await tx.lieuDeSurvenue.create({
        data: {
          codePostal: lieuDeSurvenue?.codePostal ?? '',
          commentaire: lieuDeSurvenue?.commentaire ?? '',
          societeTransport: lieuDeSurvenue?.societeTransport ?? '',
          finess: lieuDeSurvenue?.finess ?? '',
          tutelle: lieuDeSurvenue?.tutelle ?? '',
          categCode: lieuDeSurvenue?.categCode ?? '',
          categLib: lieuDeSurvenue?.categLib ?? '',
          lieuType: lieuDeSurvenue?.lieuTypeId ? { connect: { id: lieuDeSurvenue.lieuTypeId } } : undefined,
          lieuPrecision: lieuDeSurvenue?.lieuPrecision ?? '',
          transportType: lieuDeSurvenue?.transportTypeId
            ? { connect: { id: lieuDeSurvenue.transportTypeId } }
            : undefined,
        },
        select: { id: true },
      });

      if (lieuDeSurvenue?.adresse) {
        const a = lieuDeSurvenue.adresse;
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

      const misEnCause = s.misEnCause;
      const misEnCauseData = {
        rpps: misEnCause?.rpps ?? null,
        autrePrecision: misEnCause?.commentaire ?? '',
        ...(misEnCause?.misEnCauseTypeId && { misEnCauseTypeId: misEnCause.misEnCauseTypeId }),
        ...(misEnCause?.misEnCauseTypePrecisionId && {
          misEnCauseTypePrecisionId: misEnCause.misEnCauseTypePrecisionId,
        }),
      };

      const mec = await tx.misEnCause.create({
        data: misEnCauseData,
        select: { id: true },
      });

      const demarchesEngagees = s.demarchesEngagees;
      const atId = demarchesEngagees?.autoriteTypeId;
      const autorite = atId
        ? await tx.autoriteTypeEnum.findUnique({ where: { id: atId }, select: { id: true } })
        : null;

      const demIds = demarchesEngagees?.demarches?.map((id) => ({ id })) ?? [];

      const dem = await tx.demarchesEngagees.create({
        data: {
          dateContactEtablissement: demarchesEngagees?.dateContactEtablissement ?? null,
          etablissementARepondu: demarchesEngagees?.etablissementARepondu ?? null,
          commentaire: demarchesEngagees?.commentaire ?? '',
          datePlainte: demarchesEngagees?.datePlainte ?? null,
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
        },
        select: {
          id: true,
        },
      });

      const faits = (s.faits ?? []).map(async (f) => {
        await tx.fait.create({
          data: {
            situation: { connect: { id: situation.id } },
            dateDebut: f.dateDebut ?? null,
            dateFin: f.dateFin ?? null,
            commentaire: f.commentaire ?? '',
          },
        });

        if (f.motifsDeclaratifs?.length) {
          await tx.faitMotifDeclaratif.createMany({
            data: f.motifsDeclaratifs.map((motifDeclaratifId) => ({
              situationId: situation.id,
              motifDeclaratifId,
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
      select: {
        id: true,
        receptionDate: true,
        receptionTypeId: true,
        thirdPartyAccountId: true,
        createdAt: true,
      },
    });
  });
};

export const addAttachmentToRequete = async (
  requeteId: string,
  thirdPartyAccountId: string,
  file: { buffer: Buffer; fileName: string; mimeType: string; size: number },
) => {
  const logger = getLoggerStore();

  const requete = await prisma.requete.findFirst({
    where: { id: requeteId, thirdPartyAccountId },
    select: { id: true },
  });

  if (!requete) {
    return null;
  }

  const {
    objectPath,
    rollback: rollbackMinio,
    encryptionMetadata,
  } = await uploadFileToMinio(file.buffer, file.fileName, file.mimeType);

  const pathParts = objectPath.split('/');
  const fileName = pathParts[pathParts.length - 1] || '';
  const id = fileName.split('.')[0] || '';

  const uploadedFile = await prisma.uploadedFile
    .create({
      data: {
        id,
        fileName,
        filePath: objectPath,
        mimeType: file.mimeType,
        size: file.size,
        metadata: {
          originalName: file.fileName,
          ...(encryptionMetadata && { encryption: encryptionMetadata }),
        },
        entiteId: null,
        uploadedById: null,
        requeteEtapeNoteId: null,
        requeteId: requete.id,
        demarchesEngageesId: null,
        faitSituationId: null,
        status: 'PENDING',
        canDelete: true,
      },
    })
    .catch(async (err) => {
      await rollbackMinio();
      throw err;
    });

  await addFileProcessingJob({
    fileId: uploadedFile.id,
    fileName: uploadedFile.fileName,
    filePath: uploadedFile.filePath,
    mimeType: uploadedFile.mimeType,
  });

  logger.info({ requeteId, fileId: uploadedFile.id }, 'Attachment added to requete via third-party API');

  return {
    fileId: uploadedFile.id,
    fileName: uploadedFile.fileName,
    mimeType: uploadedFile.mimeType,
    size: uploadedFile.size,
  };
};
