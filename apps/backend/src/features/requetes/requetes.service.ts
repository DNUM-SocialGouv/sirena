import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { sanitizeFilename, urlToStream } from '../../helpers/file.js';
import type { FileProcessingJobData } from '../../jobs/queues/fileProcessing.queue.js';
import { addFileProcessingJob } from '../../jobs/queues/fileProcessing.queue.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import { prisma } from '../../libs/prisma.js';
import { createDefaultRequeteEtapes } from '../requeteEtapes/requetesEtapes.service.js';
import { determineSource, generateRequeteId } from './functionalId.service.js';
import type { CreateRequeteFromDematSocialDto, ElementLinked, File } from './requetes.type.js';

export const getRequeteByDematSocialId = async (id: number) =>
  await prisma.requete.findFirst({
    where: {
      dematSocialId: id,
    },
  });

interface PreUploadedFile {
  objectPath: string;
  rollback: () => Promise<void>;
  encryptionMetadata?: { iv: string; authTag: string };
  mimeType: string;
  size: number | undefined;
  originalName: string;
  entiteId: string | null;
}

const preUploadFile = async (file: File, entiteId: string | null): Promise<PreUploadedFile> => {
  const { stream, mimeFromHeader, mimeSniffed, size, extSniffed } = await urlToStream(file.url);
  const mimeType = mimeSniffed ?? mimeFromHeader ?? 'application/octet-stream';
  const ext = extSniffed ?? file.name.split('.').pop() ?? '';
  const filename = sanitizeFilename(file.name, ext);
  const { objectPath, rollback, encryptionMetadata } = await uploadFileToMinio(stream, filename, mimeType);
  return { objectPath, rollback, encryptionMetadata, mimeType, size, originalName: file.name, entiteId };
};

export const createRequeteFromDematSocial = async ({
  dematSocialId,
  receptionDate,
  receptionTypeId,
  declarant,
  participant,
  situations,
  pdf,
}: CreateRequeteFromDematSocialDto) => {
  const logger = getLoggerStore();
  const entiteIds = Array.from(
    new Set(situations.flatMap((s) => s.entiteIds).filter((id): id is string => Boolean(id))),
  );
  const primaryEntiteId = entiteIds[0] ?? null;

  // Phase 1: Pre-upload all files to S3 in parallel, outside the transaction.
  // Keeping the transaction to DB-only operations avoids timeouts caused by the
  // cumulative network I/O of downloading from demat.social + encrypting + uploading to MinIO.
  type FileKey = string; // 'pdf' | `dem:${si}:${fi}` | `fait:${si}:${fai}:${fi}`

  const pending: { key: FileKey; file: File; entiteId: string | null; critical: boolean }[] = [];

  situations.forEach((s, si) => {
    const sitEntiteIds = Array.from(new Set(s.entiteIds.filter((id): id is string => Boolean(id))));
    const sitPrimaryEntiteId = sitEntiteIds[0] ?? primaryEntiteId;
    s.demarchesEngagees.files.forEach((file, fi) => {
      pending.push({ key: `dem:${si}:${fi}`, file, entiteId: sitPrimaryEntiteId, critical: false });
    });
    s.faits.forEach((f, fai) => {
      f.files.forEach((file, fi) => {
        pending.push({ key: `fait:${si}:${fai}:${fi}`, file, entiteId: sitPrimaryEntiteId, critical: false });
      });
    });
  });
  if (pdf) {
    pending.push({ key: 'pdf', file: pdf, entiteId: primaryEntiteId, critical: true });
  }

  const uploaded = new Map<FileKey, PreUploadedFile>();
  const settled = await Promise.allSettled(
    pending.map(async ({ key, file, entiteId }) => {
      const result = await preUploadFile(file, entiteId);
      uploaded.set(key, result);
    }),
  );

  for (let i = 0; i < settled.length; i++) {
    const settledResult = settled[i];
    const { key, critical } = pending[i];
    if (settledResult.status === 'rejected') {
      if (critical) {
        for (const info of uploaded.values()) {
          await info.rollback().catch(() => {});
        }
        throw settledResult.reason;
      }
      logger.error(
        { err: settledResult.reason },
        `Failed to pre-upload file ${key} for dematSocialId: ${dematSocialId}`,
      );
    }
  }

  // Phase 2: DB-only transaction — no network I/O, runs in seconds.
  const fileJobs: FileProcessingJobData[] = [];

  const insertFileRecord = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    key: FileKey,
    element: ElementLinked,
    canDelete = true,
  ) => {
    const info = uploaded.get(key);
    if (!info) return null;

    const pathParts = info.objectPath.split('/');
    const fileName = pathParts[pathParts.length - 1] || '';
    const id = fileName.split('.')[0] || '';

    const record = await tx.uploadedFile.create({
      data: {
        id,
        fileName,
        filePath: info.objectPath,
        mimeType: info.mimeType,
        size: info.size ?? 0,
        metadata: {
          originalName: info.originalName,
          ...(info.encryptionMetadata && { encryption: info.encryptionMetadata }),
        },
        entiteId: info.entiteId,
        uploadedById: null,
        requeteEtapeNoteId: null,
        requeteId: element.requeteId ?? null,
        demarchesEngageesId: element.demarchesEngageesId ?? null,
        faitSituationId: element.faitSituationId ?? null,
        status: 'PENDING',
        canDelete,
      },
    });

    fileJobs.push({
      fileId: record.id,
      fileName: record.fileName,
      filePath: record.filePath,
      mimeType: record.mimeType,
    });

    return record;
  };

  let result: Awaited<ReturnType<typeof prisma.requete.findUniqueOrThrow>>;

  try {
    result = await prisma.$transaction(async (tx) => {
      const source = determineSource(dematSocialId);
      const id = await generateRequeteId(source, tx);
      const requete = await tx.requete.create({
        data: {
          ...(entiteIds.length > 0
            ? {
                requeteEntites: {
                  create: entiteIds.map((entiteId) => ({
                    statut: {
                      connect: { id: REQUETE_STATUT_TYPES.NOUVEAU },
                    },
                    entite: { connect: { id: entiteId } },
                  })),
                },
              }
            : {}),
          id,
          dematSocialId,
          receptionDate,
          receptionType: { connect: { id: receptionTypeId } },
        },
      });

      const isSamePerson = declarant.estVictime === true;

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
          ...(isSamePerson && {
            aAutrePersonnes: participant?.aAutrePersonnes ?? null,
            autrePersonnes: participant?.autrePersonnes ?? '',
          }),
          declarantDe: { connect: { id: requete.id } },
          ...(isSamePerson ? { participantDe: { connect: { id: requete.id } } } : {}),
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

      if (participant && !isSamePerson) {
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
            commentaire: participant.commentaire ?? '',
            victimeInformeeCommentaire: participant.victimeInformeeCommentaire ?? '',
            veutGarderAnonymat: participant.veutGarderAnonymat ?? null,
            autrePersonnes: participant.autrePersonnes ?? '',
            aAutrePersonnes: participant.aAutrePersonnes ?? null,
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

      for (const [si, s] of situations.entries()) {
        const situationEntiteIds = Array.from(new Set(s.entiteIds.filter((id): id is string => Boolean(id))));

        const lieu = await tx.lieuDeSurvenue.create({
          data: {
            codePostal: s.lieuDeSurvenue.codePostal ?? '',
            commentaire: s.lieuDeSurvenue.commentaire ?? '',
            societeTransport: s.lieuDeSurvenue.societeTransport ?? '',
            finess: s.lieuDeSurvenue.finess ?? '',
            tutelle: s.lieuDeSurvenue.tutelle ?? '',
            categCode: s.lieuDeSurvenue.categCode ?? '',
            categLib: s.lieuDeSurvenue.categLib ?? '',
            lieuType: s.lieuDeSurvenue.lieuTypeId ? { connect: { id: s.lieuDeSurvenue.lieuTypeId } } : undefined,
            lieuPrecision: s.lieuDeSurvenue.lieuPrecision ?? '',
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

        const misEnCauseData = {
          rpps: s.misEnCause.rpps ?? null,
          autrePrecision: s.misEnCause.autrePrecision ?? '',
          civilite: s.misEnCause.civilite ?? '',
          nom: s.misEnCause.nom ?? '',
          prenom: s.misEnCause.prenom ?? '',
          commentaire: s.misEnCause.commentaire ?? '',
          ...(s.misEnCause.misEnCauseTypeId && { misEnCauseTypeId: s.misEnCause.misEnCauseTypeId }),
          ...(s.misEnCause.misEnCauseTypePrecisionId && {
            misEnCauseTypePrecisionId: s.misEnCause.misEnCauseTypePrecisionId,
          }),
        };

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
            commentaire: s.demarchesEngagees.commentaire ?? '',
            datePlainte: s.demarchesEngagees.datePlainte ?? null,
            autoriteType: autorite ? { connect: { id: autorite.id } } : undefined,
            organisme: s.demarchesEngagees.organisme ?? '',
            demarches: demIds.length ? { connect: demIds } : undefined,
          },
        });

        const demFileResults = await Promise.allSettled(
          s.demarchesEngagees.files.map((_, fi) =>
            insertFileRecord(tx, `dem:${si}:${fi}`, { demarchesEngageesId: dem.id }),
          ),
        );
        demFileResults.forEach((r) => {
          if (r.status === 'rejected') {
            logger.error(
              { err: r.reason },
              `Failed to insert file record for requete: ${requete.id}, dematSocialId: ${dematSocialId}`,
            );
          }
        });

        const situation = await tx.situation.create({
          data: {
            requete: { connect: { id: requete.id } },
            lieuDeSurvenue: { connect: { id: lieu.id } },
            misEnCause: { connect: { id: mec.id } },
            demarchesEngagees: { connect: { id: dem.id } },
            ...(situationEntiteIds.length > 0
              ? {
                  situationEntites: {
                    create: situationEntiteIds.map((entiteId) => ({
                      entite: { connect: { id: entiteId } },
                    })),
                  },
                }
              : {}),
          },
          select: {
            id: true,
          },
        });

        const faits = s.faits.map(async (f, fai) => {
          await tx.fait.create({
            data: {
              situation: { connect: { id: situation.id } },
              dateDebut: f.dateDebut ?? null,
              dateFin: f.dateFin ?? null,
              commentaire: f.commentaire ?? '',
            },
          });

          const faitFileResults = await Promise.allSettled(
            f.files.map((_, fi) => insertFileRecord(tx, `fait:${si}:${fai}:${fi}`, { faitSituationId: situation.id })),
          );
          faitFileResults.forEach((r) => {
            if (r.status === 'rejected') {
              logger.error(
                { err: r.reason },
                `Failed to insert file record for requete: ${requete.id}, dematSocialId: ${dematSocialId}`,
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

      await insertFileRecord(tx, 'pdf', { requeteId: requete.id }, false);

      const requeteWithEntites = await tx.requete.findUniqueOrThrow({
        where: { id: requete.id },
        include: { requeteEntites: true },
      });

      for (const entite of requeteWithEntites.requeteEntites) {
        await createDefaultRequeteEtapes(requete.id, entite.entiteId, tx, null);
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
  } catch (err) {
    for (const info of uploaded.values()) {
      await info.rollback().catch(() => {});
    }
    throw err;
  }

  // Phase 3: Queue file processing jobs after the transaction has committed.
  for (const job of fileJobs) {
    await addFileProcessingJob(job).catch((jobErr) => {
      logger.error({ err: jobErr, ...job }, 'Failed to queue file processing job');
    });
  }

  return result;
};

export const updateDateAndTypeRequete = async (
  requeteId: string,
  data: {
    receptionDate?: Date | null;
    receptionTypeId?: string | null;
    provenanceId?: string | null;
    provenancePrecision?: string | null;
  },
  controls?: { updatedAt: string },
) => {
  const requete = await prisma.requete.findUnique({
    where: { id: requeteId },
  });

  if (!requete) {
    throw new Error('Requete not found');
  }

  if (controls?.updatedAt) {
    const clientUpdatedAt = new Date(controls.updatedAt);
    const serverUpdatedAt = requete.updatedAt;

    if (serverUpdatedAt.getTime() !== clientUpdatedAt.getTime()) {
      const error = new Error('CONFLICT: The participant identity has been modified by another user.');
      (error as Error & { conflictData?: unknown }).conflictData = {
        serverData: requete,
        serverUpdatedAt: serverUpdatedAt.toISOString(),
      };
      throw error;
    }
  }

  return prisma.requete.update({
    where: { id: requeteId },
    data: {
      ...(data.receptionDate !== undefined && { receptionDate: data.receptionDate }),
      ...(data.receptionTypeId !== undefined && { receptionTypeId: data.receptionTypeId }),
      ...(data.provenanceId !== undefined && { provenanceId: data.provenanceId }),
      ...(data.provenancePrecision !== undefined && { provenancePrecision: data.provenancePrecision }),
    },
  });
};
