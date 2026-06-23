import { REQUETE_ETAPE_STATUT_TYPES, REQUETE_ETAPE_TYPES, REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import type { PinoLogger } from 'hono-pino';
import { capitalizeFirst, formatDateFr } from '../../helpers/string.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { deleteFileFromMinio } from '../../libs/minio.js';
import type { Prisma } from '../../libs/prisma.js';
import { prisma, type RequeteEtape } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import { isUserOwner, setEtapeFile } from '../uploadedFiles/uploadedFiles.service.js';
import type {
  AddProcessingStepDto,
  GetRequeteEtapesQuery,
  UpdateProcessingStepDto,
  UpdateRequeteEtapeDateRealisationDto,
  UpdateRequeteEtapeNomDto,
  UpdateRequeteEtapeStatutDto,
} from './requetesEtapes.type.js';

export const CREATION_STEP_NAME_PREFIX = 'Création de la requête';
export const AUTOMATIC_CREATION_STEP_NAME_PREFIX = 'Création de la requête';
export const ACKNOWLEDGMENT_STEP_NAME = "Envoi de l'accusé de réception";

export const createDefaultRequeteEtapes = async (
  requeteId: string,
  entiteId: string,
  tx?: Prisma.TransactionClient,
  changedById?: string | null,
) => {
  const prismaClient = tx ?? prisma;

  // Ensure RequeteEntite exists
  const requeteEntite = await prismaClient.requeteEntite.findUnique({
    where: {
      requeteId_entiteId: {
        requeteId,
        entiteId,
      },
    },
    include: {
      requete: {
        select: {
          dematSocialId: true,
          createdAt: true,
          createdBy: {
            select: {
              prenom: true,
              nom: true,
            },
          },
        },
      },
    },
  });

  if (!requeteEntite) {
    return null;
  }

  // Check default step already created
  const existingEtapes = await prismaClient.requeteEtape.findMany({
    where: {
      requeteId,
      entiteId,
    },
  });

  if (existingEtapes.length > 0) {
    return null;
  }

  const creationDate = requeteEntite.requete?.createdAt ?? new Date();
  const formattedCreationDate = formatDateFr(creationDate);

  const isAutomaticCreation = requeteEntite.requete?.dematSocialId != null;
  const createdBy = requeteEntite.requete?.createdBy;

  // Acknowledgment step is always created as A_FAIRE.
  // It gets set to FAIT by updateAcknowledgmentStep() when the acknowledgment email is actually sent.
  const creationStepName = isAutomaticCreation
    ? `${AUTOMATIC_CREATION_STEP_NAME_PREFIX} ${formattedCreationDate}`
    : `${CREATION_STEP_NAME_PREFIX} ${formattedCreationDate}${
        createdBy ? ` par ${capitalizeFirst(createdBy.prenom)} ${capitalizeFirst(createdBy.nom)}` : ''
      }`;

  const etape1 = await prismaClient.requeteEtape.create({
    data: {
      requeteId: requeteId,
      entiteId: entiteId,
      statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
      nom: creationStepName,
      type: REQUETE_ETAPE_TYPES.CREATION,
    },
  });

  const etape2 = await prismaClient.requeteEtape.create({
    data: {
      requeteId: requeteId,
      entiteId: entiteId,
      statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
      nom: ACKNOWLEDGMENT_STEP_NAME,
      type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
    },
  });

  const createEtapeChangelog = async (
    etape: RequeteEtape,
    action: ChangeLogAction,
    before: Prisma.JsonObject | null,
    after: Prisma.JsonObject | null,
  ) => {
    if (changedById !== undefined) {
      try {
        await createChangeLog({
          entity: 'RequeteEtape',
          entityId: etape.id,
          action,
          before,
          after,
          changedById: changedById ?? null,
        });
      } catch (changelogError) {
        const logger = getLoggerStore();
        logger.error(
          { requeteId, entiteId, etapeId: etape.id, error: changelogError },
          'Failed to create changelog entry for requete etape',
        );
      }
    }
  };

  await Promise.all([
    createEtapeChangelog(etape1, ChangeLogAction.CREATED, null, {
      id: etape1.id,
      nom: etape1.nom,
      estPartagee: etape1.estPartagee,
      statutId: etape1.statutId,
      requeteId: etape1.requeteId,
      entiteId: etape1.entiteId,
      clotureReasonIds: [],
      createdAt: etape1.createdAt.toISOString(),
    } as Prisma.JsonObject),
    createEtapeChangelog(etape2, ChangeLogAction.CREATED, null, {
      id: etape2.id,
      nom: etape2.nom,
      estPartagee: etape2.estPartagee,
      statutId: etape2.statutId,
      requeteId: etape2.requeteId,
      entiteId: etape2.entiteId,
      clotureReasonIds: [],
      createdAt: etape2.createdAt.toISOString(),
    } as Prisma.JsonObject),
  ]);

  return { etape1, etape2 };
};

export const getEtapeEditability = (etape: {
  type: string;
  statutId: string | null;
  requete: { createdById: string | null } | null;
}): { editable: boolean; ackNotesOnly: boolean } => {
  if (etape.statutId === REQUETE_ETAPE_STATUT_TYPES.CLOTUREE) return { editable: false, ackNotesOnly: false };
  if (etape.type === REQUETE_ETAPE_TYPES.CREATION || etape.type === REQUETE_ETAPE_TYPES.REOPEN) {
    return { editable: false, ackNotesOnly: false };
  }
  const ackNotesOnly = etape.type === REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT && etape.requete?.createdById == null;
  return { editable: true, ackNotesOnly };
};

export class EtapeNotEditableError extends Error {
  code = 'ETAPE_NOT_EDITABLE' as const;
}

export class FilesNotOwnedError extends Error {
  code = 'FILES_NOT_OWNED' as const;
}

const logNoteChangelog = async (
  action: ChangeLogAction,
  noteId: string,
  before: Prisma.JsonObject | null,
  after: Prisma.JsonObject | null,
  changedById: string,
  logger: Pick<PinoLogger, 'error'>,
): Promise<void> => {
  try {
    await createChangeLog({ entity: 'RequeteEtapeNote', entityId: noteId, action, before, after, changedById });
  } catch (err) {
    logger.error({ err, noteId }, 'Failed to create changelog for note');
  }
};

export const createProcessingEtape = async (
  requeteId: string,
  entiteId: string | null,
  userId: string,
  data: AddProcessingStepDto,
  logger: PinoLogger,
) => {
  if (!entiteId) {
    return null;
  }

  const requete = await prisma.requete.findUnique({ where: { id: requeteId } });
  if (!requete) {
    return null;
  }

  await prisma.requeteEntite.upsert({
    where: { requeteId_entiteId: { requeteId, entiteId } },
    create: { requeteId, entiteId, statutId: REQUETE_STATUT_TYPES.NOUVEAU },
    update: {},
  });

  const statutId = data.statutId ?? REQUETE_ETAPE_STATUT_TYPES.A_FAIRE;
  const dateRealisation = statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT ? (data.dateRealisation ?? new Date()) : null;

  if (data.fileIds.length > 0 && !(await isUserOwner(userId, data.fileIds))) {
    throw new FilesNotOwnedError('FILES_NOT_OWNED');
  }

  const createdNotes: { id: string; texte: string; authorId: string | null; requeteEtapeId: string }[] = [];

  const etape = await prisma.$transaction(async (tx) => {
    const etape = await tx.requeteEtape.create({
      data: {
        requeteId,
        entiteId,
        nom: data.nom,
        type: REQUETE_ETAPE_TYPES.MANUAL,
        statutId,
        dateRealisation,
        createdById: userId,
      },
    });

    for (const note of data.notes) {
      const created = await tx.requeteEtapeNote.create({
        data: { authorId: userId, texte: note.texte, requeteEtapeId: etape.id },
      });
      createdNotes.push(created);
    }

    if (data.fileIds.length > 0) {
      await setEtapeFile(etape.id, data.fileIds, entiteId, userId, tx);
    }

    return etape;
  });

  await Promise.allSettled(
    createdNotes.map((note) =>
      logNoteChangelog(
        ChangeLogAction.CREATED,
        note.id,
        null,
        { id: note.id, texte: note.texte, authorId: note.authorId, requeteEtapeId: note.requeteEtapeId },
        userId,
        logger,
      ),
    ),
  );

  return etape;
};

export const updateProcessingEtape = async (
  stepId: string,
  userId: string,
  data: UpdateProcessingStepDto,
  logger: PinoLogger,
): Promise<RequeteEtape | null> => {
  const etape = await prisma.requeteEtape.findUnique({
    where: { id: stepId },
    include: {
      notes: { select: { id: true, authorId: true, texte: true } },
      uploadedFiles: { select: { id: true, canDelete: true, filePath: true } },
      requete: { select: { createdById: true } },
    },
  });
  if (!etape) {
    return null;
  }

  const { editable, ackNotesOnly } = getEtapeEditability(etape);
  if (!editable) {
    throw new EtapeNotEditableError('ETAPE_NOT_EDITABLE');
  }

  // Diff notes — only notes of THIS step and non system (authorId non null) are editable/deletable.
  const editableNoteIds = new Set(etape.notes.filter((n) => n.authorId !== null).map((n) => n.id));
  const existingNoteById = new Map(etape.notes.map((n) => [n.id, n]));
  const sentNoteIds = new Set(data.notes.filter((n) => n.id).map((n) => n.id as string));
  const notesToDelete = etape.notes.filter((n) => n.authorId !== null && !sentNoteIds.has(n.id));

  // Diff files — only remove those removed AND deletable (canDelete) ; never lose anything else.
  const currentFileIds = new Set(etape.uploadedFiles.map((f) => f.id));
  const desiredFileIds = new Set(data.fileIds);
  const fileIdsToAttach = data.fileIds.filter((id) => !currentFileIds.has(id));
  const filesToRemove = etape.uploadedFiles.filter((f) => !desiredFileIds.has(f.id) && f.canDelete);

  // User must own the files he attaches
  if (!ackNotesOnly && fileIdsToAttach.length > 0 && !(await isUserOwner(userId, fileIdsToAttach))) {
    throw new FilesNotOwnedError('FILES_NOT_OWNED');
  }

  const dateRealisation =
    data.statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT ? (data.dateRealisation ?? new Date()) : null;

  const noteChangelogs: {
    action: ChangeLogAction;
    id: string;
    before: Prisma.JsonObject | null;
    after: Prisma.JsonObject | null;
  }[] = [];

  await prisma.$transaction(async (tx) => {
    if (!ackNotesOnly) {
      await tx.requeteEtape.update({
        where: { id: stepId },
        data: { nom: data.nom, statutId: data.statutId, dateRealisation },
      });
    }

    // The panel sends the full desired state of the notes:
    // - note with an id that is editable (of this step, non system) -> update the text;
    // - note with an id that is not editable (system / other entity) -> ignored (read-only);
    // - note without an id -> create.
    // Editable notes missing from the payload are deleted (notesToDelete, below).
    for (const note of data.notes) {
      if (note.id) {
        if (editableNoteIds.has(note.id)) {
          const before = existingNoteById.get(note.id);
          await tx.requeteEtapeNote.update({ where: { id: note.id }, data: { texte: note.texte } });
          if (before && before.texte !== note.texte) {
            noteChangelogs.push({
              action: ChangeLogAction.UPDATED,
              id: note.id,
              before: { texte: before.texte, authorId: before.authorId },
              after: { texte: note.texte, authorId: before.authorId },
            });
          }
        }
      } else {
        const created = await tx.requeteEtapeNote.create({
          data: { authorId: userId, texte: note.texte, requeteEtapeId: stepId },
        });
        noteChangelogs.push({
          action: ChangeLogAction.CREATED,
          id: created.id,
          before: null,
          after: { id: created.id, texte: created.texte, authorId: created.authorId, requeteEtapeId: stepId },
        });
      }
    }
    for (const note of notesToDelete) {
      await tx.requeteEtapeNote.delete({ where: { id: note.id } });
      noteChangelogs.push({
        action: ChangeLogAction.DELETED,
        id: note.id,
        before: { id: note.id, texte: note.texte, authorId: note.authorId },
        after: null,
      });
    }

    if (!ackNotesOnly) {
      if (fileIdsToAttach.length > 0) {
        await setEtapeFile(stepId, fileIdsToAttach, etape.entiteId, userId, tx);
      }
      if (filesToRemove.length > 0) {
        await tx.uploadedFile.deleteMany({ where: { id: { in: filesToRemove.map((f) => f.id) } } });
      }
    }
  });

  await Promise.allSettled(
    noteChangelogs.map((ev) => logNoteChangelog(ev.action, ev.id, ev.before, ev.after, userId, logger)),
  );

  if (!ackNotesOnly && filesToRemove.length > 0) {
    await Promise.allSettled(
      filesToRemove.map(async (f) => {
        try {
          await createChangeLog({
            entity: 'UploadedFile',
            entityId: f.id,
            action: ChangeLogAction.DELETED,
            before: { id: f.id, canDelete: f.canDelete, filePath: f.filePath } as Prisma.JsonObject,
            after: null,
            changedById: userId,
          });
        } catch (err) {
          logger.error({ err, fileId: f.id }, 'Failed to create changelog for removed step file');
        }
      }),
    );
  }

  // Delete physical files from MinIO after commit
  if (!ackNotesOnly && filesToRemove.length > 0) {
    await Promise.allSettled(
      filesToRemove.map(async (f) => {
        try {
          await deleteFileFromMinio(f.filePath);
        } catch (err) {
          logger.error({ err, filePath: f.filePath }, 'Failed to delete MinIO file from step');
        }
      }),
    );
  }

  return prisma.requeteEtape.findUnique({ where: { id: stepId } });
};

export const getRequeteEtapes = async (requeteId: string, entiteId: string | null, query: GetRequeteEtapesQuery) => {
  if (!entiteId) {
    return { data: [], total: 0 };
  }

  const { offset = 0, limit, sort = 'createdAt', order = 'desc' } = query;

  const where = {
    requeteId,
    entiteId,
  };

  const [raw, total] = await Promise.all([
    prisma.requeteEtape.findMany({
      where,
      skip: offset,
      ...(typeof limit === 'number' ? { take: limit } : {}),
      orderBy: { [sort]: order },
      select: {
        id: true,
        nom: true,
        type: true,
        statutId: true,
        dateRealisation: true,
        clotureReason: {
          select: {
            label: true,
          },
        },
        clotureEffectiveDate: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            prenom: true,
            nom: true,
          },
        },
        notes: {
          select: {
            id: true,
            texte: true,
            createdAt: true,
            uploadedFiles: {
              select: {
                id: true,
                size: true,
                metadata: true,
                status: true,
                scanStatus: true,
                sanitizeStatus: true,
                safeFilePath: true,
              },
            },
            author: {
              select: {
                prenom: true,
                nom: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        requeteId: true,
        entiteId: true,
        requete: {
          select: {
            createdBy: {
              select: { prenom: true, nom: true },
            },
            dematSocialId: true,
            thirdPartyAccountId: true,
          },
        },
      },
    }),
    prisma.requeteEtape.count({
      where,
    }),
  ]);

  return {
    data: raw,
    total,
  };
};

export const getRequeteEtapeById = async (id: string) =>
  await prisma.requeteEtape.findUnique({
    where: { id },
  });

export const updateRequeteEtapeStatut = async (
  id: string,
  data: UpdateRequeteEtapeStatutDto,
): Promise<RequeteEtape | null> => {
  const requeteEtape = await getRequeteEtapeById(id);
  if (!requeteEtape) {
    return null;
  }

  let dateRealisation: Date | null | undefined;
  if (requeteEtape.type === REQUETE_ETAPE_TYPES.MANUAL) {
    if (data.statutId === REQUETE_ETAPE_STATUT_TYPES.FAIT) {
      dateRealisation = requeteEtape.dateRealisation ?? new Date();
    } else {
      dateRealisation = null;
    }
  }

  const updatedRequeteEtape = await prisma.requeteEtape.update({
    where: { id },
    data: {
      statutId: data.statutId,
      ...(dateRealisation !== undefined ? { dateRealisation } : {}),
    },
  });

  return updatedRequeteEtape;
};

export const updateRequeteEtapeDateRealisation = async (
  id: string,
  data: UpdateRequeteEtapeDateRealisationDto,
): Promise<RequeteEtape | null> => {
  const requeteEtape = await getRequeteEtapeById(id);
  if (!requeteEtape) {
    return null;
  }

  if (requeteEtape.type !== REQUETE_ETAPE_TYPES.MANUAL || requeteEtape.statutId !== REQUETE_ETAPE_STATUT_TYPES.FAIT) {
    return null;
  }

  return prisma.requeteEtape.update({
    where: { id },
    data: {
      dateRealisation: data.dateRealisation,
    },
  });
};

export const updateRequeteEtapeNom = async (
  id: string,
  data: UpdateRequeteEtapeNomDto,
): Promise<RequeteEtape | null> => {
  const requeteEtape = await getRequeteEtapeById(id);
  if (!requeteEtape) {
    return null;
  }

  return prisma.requeteEtape.update({
    where: { id },
    data: {
      nom: data.nom,
    },
  });
};

/**
 * Updates the acknowledgment step for all entities (when acknowledgment email is sent automatically)
 * @param requeteId - The ID of the requete
 * @param entiteIds - Array of entity IDs that received the acknowledgment email
 */
export const updateAcknowledgmentStep = async (requeteId: string, entiteIds: string[]): Promise<void> => {
  const logger = getLoggerStore();

  try {
    const etapes = await prisma.requeteEtape.findMany({
      where: {
        requeteId,
        entiteId: { in: entiteIds },
        type: REQUETE_ETAPE_TYPES.ACKNOWLEDGMENT,
        statutId: REQUETE_ETAPE_STATUT_TYPES.A_FAIRE,
        createdBy: null,
      },
    });

    if (etapes.length === 0) {
      logger.debug({ requeteId, entiteIds }, 'No acknowledgment steps found to update');
      return;
    }

    await Promise.all(
      etapes.map(async (etape) => {
        const before = {
          id: etape.id,
          nom: etape.nom,
          statutId: etape.statutId,
          requeteId: etape.requeteId,
          entiteId: etape.entiteId,
          createdAt: etape.createdAt.toISOString(),
          updatedAt: etape.updatedAt.toISOString(),
        } as Prisma.JsonObject;

        const updatedEtape = await prisma.requeteEtape.update({
          where: { id: etape.id },
          data: {
            statutId: REQUETE_ETAPE_STATUT_TYPES.FAIT,
          },
        });

        const after = {
          id: updatedEtape.id,
          nom: updatedEtape.nom,
          statutId: updatedEtape.statutId,
          requeteId: updatedEtape.requeteId,
          entiteId: updatedEtape.entiteId,
          createdAt: updatedEtape.createdAt.toISOString(),
          updatedAt: updatedEtape.updatedAt.toISOString(),
        } as Prisma.JsonObject;

        // Create changelog
        try {
          await createChangeLog({
            entity: 'RequeteEtape',
            entityId: etape.id,
            action: ChangeLogAction.UPDATED,
            before,
            after,
            changedById: null, // System action
          });
        } catch (changelogError) {
          logger.error(
            { requeteId, etapeId: etape.id, error: changelogError },
            'Failed to create changelog entry for automatic acknowledgment step update',
          );
        }
      }),
    );

    logger.info(
      { requeteId, entiteIds, updatedStepsCount: etapes.length },
      'Acknowledgment steps updated automatically to FAIT status',
    );
  } catch (error) {
    logger.error({ requeteId, entiteIds, error }, 'Failed to update acknowledgment steps automatically');
    throw error;
  }
};

export const deleteRequeteEtape = async (id: string, logger: PinoLogger, changedById?: string): Promise<void> => {
  const requeteEtape = await prisma.requeteEtape.findUnique({
    where: { id },
    include: {
      notes: { include: { uploadedFiles: true } },
    },
  });

  if (!requeteEtape) {
    return;
  }

  const notes = requeteEtape.notes.map(({ uploadedFiles, ...note }) => note);
  const files = requeteEtape.notes.flatMap((n) => n.uploadedFiles);
  const filePaths = files.map((f) => f.filePath);

  // Delete RequeteEtape (all related entities will be deleted in cascade)
  await prisma.requeteEtape.delete({ where: { id } });

  if (changedById) {
    // Create changelogs for notes and files (individual entities)
    if (notes.length > 0) {
      await Promise.allSettled(
        notes.map(async (note) => {
          try {
            await createChangeLog({
              entity: 'RequeteEtapeNote',
              entityId: note.id,
              action: ChangeLogAction.DELETED,
              before: note as unknown as Prisma.JsonObject,
              after: {},
              changedById,
            });
          } catch (err) {
            logger.error({ err, noteId: note.id }, 'Failed to create changelog for note');
          }
        }),
      );
    }

    if (files.length > 0) {
      await Promise.allSettled(
        files.map(async (file) => {
          try {
            await createChangeLog({
              entity: 'UploadedFile',
              entityId: file.id,
              action: ChangeLogAction.DELETED,
              before: file as unknown as Prisma.JsonObject,
              after: {},
              changedById,
            });
          } catch (err) {
            logger.error({ err, fileId: file.id }, 'Failed to create changelog for file');
          }
        }),
      );
    }
  }

  // Delete physical files from MinIO
  if (filePaths.length > 0) {
    await Promise.allSettled(
      filePaths.map(async (filePath) => {
        try {
          await deleteFileFromMinio(filePath);
        } catch (err) {
          logger.error({ err, filePath }, 'Failed to delete MinIO file');
        }
      }),
    );
  }
};
