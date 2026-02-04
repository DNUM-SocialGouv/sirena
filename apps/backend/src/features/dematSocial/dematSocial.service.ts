import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';
import { envVars } from '../../config/env.js';
import { serializeError } from '../../helpers/errors.js';
import { isPrismaUniqueConstraintError, retryWithBackoff } from '../../helpers/retry.js';
import { abortControllerStorage, getLoggerStore, getSentryStore } from '../../libs/asyncLocalStorage.js';
import {
  ChangerInstructionDocument,
  GetDossierDocument,
  GetDossiersByDateDocument,
  GetDossiersMetadataDocument,
  GetInstructeursDocument,
  graffle,
} from '../../libs/graffle.js';
import { sendDeclarantAcknowledgmentEmail } from '../declarants/declarants.notification.service.js';
import { createRequeteFromDematSocial, getRequeteByDematSocialId } from '../requetes/requetes.service.js';
import { assignEntitesToRequeteTask } from './affectation/affectation.js';
import { mapDataForPrisma } from './dematSocial.adapter.js';
import type { Demandeur, DematSocialCivilite, Mandataire } from './dematSocial.type.js';
import {
  createImportFailure,
  type ImportFailureErrorType,
  markFailureAsResolved,
} from './dematSocialImportFailure.service.js';

export const getInstructeurs = async () => {
  return await graffle.gql(GetInstructeursDocument).send({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY });
};

export const updateInstruction = async (id: string) => {
  const dossierId = Buffer.from(id).toString('base64');
  const instructeurId = Buffer.from(envVars.DEMAT_SOCIAL_INSTRUCTEUR_ID).toString('base64');
  return await graffle.gql(ChangerInstructionDocument).send({ dossierId, instructeurId, disableNotification: true });
};

export const getRequetes = async (createdSince?: Date) => {
  const abortController = abortControllerStorage.getStore();
  const allDossiers = [];
  let hasNextPage = true;
  let cursor: string | undefined;

  while (hasNextPage) {
    const data = await graffle
      .transport({ raw: { signal: abortController?.signal } })
      .gql(GetDossiersByDateDocument)
      .send({
        demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY,
        createdSince: createdSince?.toISOString(),
        after: cursor,
      });

    const nodes = data?.demarche.dossiers?.nodes?.filter((node) => !!node) || [];
    allDossiers.push(...nodes);

    hasNextPage = data?.demarche.dossiers?.pageInfo?.hasNextPage ?? false;
    cursor = data?.demarche.dossiers?.pageInfo?.endCursor ?? undefined;

    if (hasNextPage && !cursor) {
      break;
    }
  }

  return allDossiers;
};

export const getRequetesMetaData = async () =>
  await graffle.gql(GetDossiersMetadataDocument).send({ demarcheNumber: envVars.DEMAT_SOCIAL_API_DIRECTORY });

export const getRequete = async (id: number) => {
  return await graffle.gql(GetDossierDocument).send({ dossierNumber: id });
};

type DossierData = NonNullable<Awaited<ReturnType<typeof getRequete>>>['dossier'];

type DemandeurData = DossierData['demandeur'];

export const getDemandeur = (d: DemandeurData): Demandeur => ({
  nom: d?.__typename === 'PersonnePhysique' ? d.nom : '',
  prenom: d?.__typename === 'PersonnePhysique' ? d.prenom : '',
  civiliteId:
    d?.__typename === 'PersonnePhysique'
      ? d.civilite
        ? (d.civilite.toUpperCase() as DematSocialCivilite)
        : null
      : null,
  email: d?.__typename === 'PersonnePhysique' ? (d.email ?? '') : '',
});

export const getMandataire = (d: DossierData, email: string): Mandataire => ({
  email,
  nom: d?.mandataireLastName || '',
  prenom: d?.mandataireFirstName || '',
});

/**
 * Determines the error type (technical vs functional) for better diagnosis
 */
const determineErrorType = (error: unknown): ImportFailureErrorType => {
  if (!error) return 'UNKNOWN';

  const errorObj = error as Error;
  const errorMessage = errorObj.message?.toLowerCase() || '';
  const errorName = errorObj.name || '';

  // Technical errors: network, timeout, database, etc.
  const technicalIndicators = [
    'timeout',
    'network',
    'connection',
    'econnrefused',
    'etimedout',
    'prisma',
    'database',
    'transaction',
    'abort',
    'signal',
  ];

  // Functional errors: invalid data, mapping, validation, etc.
  const functionalIndicators = [
    'validation',
    'invalid',
    'missing',
    'required',
    'mapping',
    'enum',
    'champmappingerror',
    'enumnofound',
  ];

  const isTechnical = technicalIndicators.some(
    (indicator) => errorMessage.includes(indicator) || errorName.toLowerCase().includes(indicator),
  );

  const isFunctional = functionalIndicators.some(
    (indicator) => errorMessage.includes(indicator) || errorName.toLowerCase().includes(indicator),
  );

  if (isTechnical) return 'TECHNICAL';
  if (isFunctional) return 'FUNCTIONAL';
  return 'UNKNOWN';
};

/**
 * Extracts a readable error message and context for logging
 */
const extractErrorDetails = (error: unknown, dossierNumber: number) => {
  const errorObj = error as Error;
  const errorMessage = errorObj.message || String(error);
  const errorStack = errorObj.stack;
  const errorName = errorObj.name;

  return {
    message: errorMessage,
    context: {
      dossierNumber,
      errorName,
      errorStack,
      timestamp: new Date().toISOString(),
    },
  };
};

export const importSingleDossier = async (
  dossierNumber: number,
): Promise<{ success: boolean; requeteId?: string; alreadyImported?: boolean }> => {
  const logger = getLoggerStore();
  const sentry = getSentryStore();

  const existingRequete = await getRequeteByDematSocialId(dossierNumber);
  if (existingRequete) {
    // Mark as resolved if it was a failure
    await markFailureAsResolved(dossierNumber, existingRequete.id);
    return { success: true, requeteId: existingRequete.id, alreadyImported: true };
  }

  logger.info({ dossierNumber }, `Importing single dossier ${dossierNumber}`);

  let step:
    | 'getRequete'
    | 'updateInstruction'
    | 'mapDataForPrisma'
    | 'createRequeteFromDematSocial'
    | 'assignEntitesToRequeteTask'
    | 'unknown' = 'unknown';

  try {
    step = 'getRequete';
    const data = await getRequete(dossierNumber);
    if (!data) {
      const errorType = determineErrorType(new Error('No data returned from getRequete'));
      const { message, context } = extractErrorDetails(
        new Error('No data returned from getRequete API call'),
        dossierNumber,
      );

      await createImportFailure({
        dematSocialId: dossierNumber,
        errorType,
        errorMessage: message,
        errorContext: context,
      });

      logger.error({ dossierNumber, errorType }, `Failed to fetch dossier data for ${dossierNumber}`);
      return { success: false };
    }
    step = 'mapDataForPrisma';
    const demandeur = getDemandeur(data.dossier.demandeur);
    const mandataire = getMandataire(data.dossier, data.dossier.usager.email);
    const requete = mapDataForPrisma(data.dossier.champs, dossierNumber, data.dossier.dateDepot, mandataire, demandeur);
    const ext = data.dossier.pdf?.filename?.split('.')?.pop() ?? '';
    const pdf = data.dossier.pdf
      ? {
          name: `Requete originale formulaire - ${dossierNumber}.${ext}`,
          url: data.dossier.pdf.url,
          size: BigInt(data.dossier.pdf.byteSize),
          mimeType: data.dossier.pdf.contentType || 'application/pdf',
        }
      : null;

    step = 'createRequeteFromDematSocial';
    const createdRequete = await retryWithBackoff(() => createRequeteFromDematSocial({ ...requete, pdf }), {
      shouldRetry: (err) => isPrismaUniqueConstraintError(err, 'id'),
      context: { dossierNumber },
    });

    // Mark the failure as resolved
    await markFailureAsResolved(dossierNumber, createdRequete.id);

    step = 'updateInstruction';
    const update = await updateInstruction(`Dossier-${dossierNumber}`);
    if (!update?.dossierPasserEnInstruction?.dossier) {
      const errors = update?.dossierPasserEnInstruction?.errors || [];
      const errorMessage = errors.map((e) => e.message).join(', ');
      logger.warn({ dossierNumber, errors: errorMessage }, `Failed to change instruction for dossier ${dossierNumber}`);
    }

    // Assign the entities (non-blocking error)
    step = 'assignEntitesToRequeteTask';
    try {
      await assignEntitesToRequeteTask(dossierNumber.toString());
    } catch (err) {
      logger.error(
        { err, dossierNumber, requeteId: createdRequete.id },
        `Error assigning entities to requete ${dossierNumber}`,
      );
      sentry.captureException(err);
    }

    try {
      await sendDeclarantAcknowledgmentEmail(createdRequete.id);
    } catch (err) {
      logger.error(
        { err, dossierNumber, requeteId: createdRequete.id },
        `Error sending acknowledgment email for requete ${dossierNumber}`,
      );
      sentry.captureException(err);
    }

    logger.debug({ dossierNumber, requeteId: createdRequete.id }, 'Successfully imported dossier');
    return { success: true, requeteId: createdRequete.id };
  } catch (err) {
    const errorId = randomUUID();
    const errorType = determineErrorType(err);
    const { message, context } = extractErrorDetails(err, dossierNumber);

    await createImportFailure({
      dematSocialId: dossierNumber,
      errorType,
      errorMessage: `Error id: ${errorId} - ${message}`,
      errorContext: { ...context, errorId },
    });

    logger.error(
      {
        errorId,
        dossierNumber,
        errorType,
        step,
        err: serializeError(err),
      },
      `Error processing dossier ${dossierNumber}`,
    );

    if (sentry) {
      sentry.setTag('errorId', errorId);
      sentry.setContext('importSingleDossier', {
        dossierNumber,
        errorType,
        step,
      });
      Sentry.captureException(err, sentry);
    } else {
      Sentry.captureException(err, {
        tags: {
          errorId,
        },
        contexts: {
          importSingleDossier: {
            dossierNumber,
            errorType,
            step,
          },
        },
      });
    }

    return { success: false };
  }
};

export const importRequetes = async (createdSince?: Date) => {
  const logger = getLoggerStore();

  if (createdSince) {
    logger.info({ createdSince: createdSince.toUTCString() }, 'Importing requetes from date');
  } else {
    logger.info('Importing all requetes');
  }

  const dossiers = await getRequetes(createdSince);
  logger.info({ totalDossiers: dossiers.length }, 'Found dossiers to process');
  let i = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const dossier of dossiers) {
    // legacy, we don't support
    // TODO: remove after some time
    if (dossier.number < 285277) {
      skippedCount += 1;
      continue;
    }
    const result = await importSingleDossier(dossier.number);

    if (result.success && !result.alreadyImported) {
      i += 1;
    } else if (!result.success) {
      errorCount += 1;
    }
  }

  logger.info(
    {
      successCount: i,
      errorCount,
      skippedCount,
      totalProcessed: dossiers.length,
    },
    `Import completed: ${i} requete(s) added, ${errorCount} error(s), ${skippedCount} skipped`,
  );

  return { count: i, errorCount, skippedCount };
};
