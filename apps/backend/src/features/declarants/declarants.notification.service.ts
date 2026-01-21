import { envVars } from '../../config/env.js';
import {
  ACKNOWLEDGMENT_EMAIL_TEMPLATE_ID,
  ACKNOWLEDGMENT_EMAIL_TEMPLATE_NAME,
} from '../../config/tipimail.constant.js';
import { pick } from '../../helpers/object.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { generateEmailPdf } from '../../libs/mail/mailToPdf.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { uploadFileToMinio } from '../../libs/minio.js';
import { type Prisma, prisma, type UploadedFile } from '../../libs/prisma.js';
import { createChangeLog } from '../changelog/changelog.service.js';
import { ChangeLogAction } from '../changelog/changelog.type.js';
import { ACKNOWLEDGMENT_STEP_NAME, updateAcknowledgmentStep } from '../requeteEtapes/requetesEtapes.service.js';
import { createUploadedFile } from '../uploadedFiles/uploadedFiles.service.js';

/**
 * Formats the list of administrative entity names (entities without a parent entity)
 * Example: "ARS Normandie" or "ARS Normandie et Conseil départemental du Calvados"
 */
function formatEntiteAdminString(entites: Array<{ nomComplet: string; entiteMereId: string | null }>): string {
  const entitesAdmin = entites.filter((e) => e.entiteMereId === null);

  if (entitesAdmin.length === 0) return '';
  if (entitesAdmin.length === 1) return entitesAdmin[0].nomComplet;

  const allButLast = entitesAdmin
    .slice(0, -1)
    .map((e) => e.nomComplet)
    .join(', ');
  const last = entitesAdmin[entitesAdmin.length - 1].nomComplet;
  return `${allButLast} et ${last}`;
}

/**
 * Formats the complete entity information with contact details
 * Example:
 * NOM COMPLET ENTITE 1
 * Adresse e-mail : adresse@boite-mail.com
 * Téléphone : 02 01 02 03 04 05
 * Adresse postale : Bâtiment, Voie, Code postal, Ville
 */
function formatEntiteCompleteString(
  entites: Array<{ nomComplet: string; email: string; entiteMereId: string | null }>,
): string {
  // Filter only administrative entities
  const entitesAdmin = entites.filter((e) => e.entiteMereId === null);

  return entitesAdmin
    .map((entite) => {
      const parts: string[] = [entite.nomComplet];
      if (entite.email) {
        parts.push(`Adresse e-mail : ${entite.email}`);
      }
      // TODO: Add "téléphone" and "adresse postale" when these fields are added to the Entite model
      // if (entite.telephone) {
      //   parts.push(`Téléphone : ${entite.telephone}`);
      // }
      // if (entite.adressePostale) {
      //   parts.push(`Adresse postale : ${entite.adressePostale}`);
      // }
      return parts.join('\n');
    })
    .join('\n\n');
}

/**
 * Attaches an email PDF to the acknowledgment step via RequeteEtapeNote
 */
async function attachEmailPdfToStep(
  requeteId: string,
  entiteId: string,
  pdfBuffer: Buffer,
  emailInfo: {
    from: { address: string; personalName?: string };
    to: string;
    sentDate: Date;
    template?: string;
    subject?: string;
    substitutions?: Record<string, unknown>;
  },
): Promise<void> {
  const logger = getLoggerStore();

  try {
    const etape = await prisma.requeteEtape.findFirst({
      where: {
        requeteId,
        entiteId,
        nom: ACKNOWLEDGMENT_STEP_NAME,
      },
    });

    if (!etape) {
      logger.warn({ requeteId, entiteId }, 'Acknowledgment step not found for PDF attachment');
      return;
    }

    const fileName = `AR_${requeteId}.pdf`;

    const {
      objectPath,
      rollback: rollbackMinio,
      encryptionMetadata,
    } = await uploadFileToMinio(pdfBuffer, fileName, 'application/pdf');

    try {
      const pathParts = objectPath.split('/');
      const fileNameFromPath = pathParts[pathParts.length - 1] || '';
      const fileId = fileNameFromPath.split('.')[0] || '';

      if (!fileNameFromPath || !fileId) {
        throw new Error(`Invalid file path format: ${objectPath}. Cannot extract file ID.`);
      }

      const uploadedFile = await createUploadedFile({
        id: fileId,
        fileName,
        filePath: objectPath,
        mimeType: 'application/pdf',
        size: pdfBuffer.length,
        status: 'COMPLETED',
        canDelete: false,
        scanStatus: 'PENDING',
        sanitizeStatus: 'PENDING',
        metadata: {
          originalName: fileName,
          emailFrom: emailInfo.from.address,
          emailTo: emailInfo.to,
          emailSentDate: emailInfo.sentDate.toISOString(),
          emailTemplate: emailInfo.template,
          emailSubject: emailInfo.subject,
          ...(encryptionMetadata && { encryption: encryptionMetadata }),
        },
        requeteEtapeNoteId: null,
        requeteId: null,
        faitSituationId: null,
        demarchesEngageesId: null,
        uploadedById: null,
        entiteId,
      });

      const uploadedFileTrackedFields: (keyof UploadedFile)[] = [
        'id',
        'fileName',
        'filePath',
        'mimeType',
        'size',
        'status',
        'metadata',
        'entiteId',
        'uploadedById',
        'requeteEtapeNoteId',
        'requeteId',
        'faitSituationId',
        'demarchesEngageesId',
      ];

      try {
        const afterPicked = pick(uploadedFile, uploadedFileTrackedFields);
        await createChangeLog({
          entity: 'UploadedFile',
          entityId: uploadedFile.id,
          action: ChangeLogAction.CREATED,
          before: null,
          after: afterPicked as unknown as Prisma.JsonObject,
          changedById: null, // System action
        });
      } catch (changelogError) {
        logger.error(
          { requeteId, entiteId, fileId: uploadedFile.id, error: changelogError },
          'Failed to create changelog entry for uploaded file',
        );
      }

      const note = await prisma.requeteEtapeNote.create({
        data: {
          texte: `Email d'accusé de réception envoyé le ${emailInfo.sentDate.toLocaleString('fr-FR')}`,
          authorId: null,
          requeteEtapeId: etape.id,
          uploadedFiles: {
            connect: [{ id: uploadedFile.id }],
          },
        },
      });

      try {
        await createChangeLog({
          entity: 'RequeteEtapeNote',
          entityId: note.id,
          action: ChangeLogAction.CREATED,
          before: null,
          after: {
            texte: note.texte,
            authorId: note.authorId,
          },
          changedById: null, // System action
        });
      } catch (changelogError) {
        logger.error(
          { requeteId, entiteId, noteId: note.id, error: changelogError },
          'Failed to create changelog entry for requete etape note',
        );
      }

      logger.info(
        { requeteId, entiteId, etapeId: etape.id, fileId: uploadedFile.id },
        'Email PDF attached to acknowledgment step',
      );
    } catch (error) {
      // Rollback MinIO upload if database operations fail
      await rollbackMinio();
      throw error;
    }
  } catch (error) {
    logger.error({ requeteId, entiteId, error }, 'Failed to attach email PDF to step');
    throw error;
  }
}

/**
 * Sends an acknowledgment email to the declarant when a request from demat.social is created
 * @param requeteId - The ID of the requete that was just created
 */
export async function sendDeclarantAcknowledgmentEmail(requeteId: string): Promise<void> {
  const logger = getLoggerStore();

  try {
    // Fetch the requete with declarant and entities
    const requete = await prisma.requete.findUnique({
      where: { id: requeteId },
      include: {
        declarant: {
          include: {
            identite: true,
          },
        },
        requeteEntites: {
          include: {
            entite: true,
          },
        },
      },
    });

    if (!requete) {
      logger.warn({ requeteId }, 'Requete not found for acknowledgment email');
      return;
    }

    // Only send for requests from demat.social
    if (!requete.dematSocialId) {
      logger.debug({ requeteId }, 'Requete is not from demat.social, skipping acknowledgment email');
      return;
    }

    if (!requete.declarant?.identite?.email) {
      logger.warn({ requeteId }, 'Declarant has no email, cannot send acknowledgment email');
      return;
    }

    const allEntiteIds = requete.requeteEntites.map((re) => re.entiteId).filter((id): id is string => Boolean(id));

    if (allEntiteIds.length === 0) {
      logger.debug({ requeteId }, 'No entities assigned to this requete, skipping acknowledgment email');
      return;
    }

    const entites = await prisma.entite.findMany({
      where: {
        id: { in: allEntiteIds },
        isActive: true, // Only include active entities
      },
      select: {
        id: true,
        nomComplet: true,
        email: true,
        entiteMereId: true,
      },
    });

    if (entites.length === 0) {
      logger.debug({ requeteId }, 'No active entities found for this requete, skipping acknowledgment email');
      return;
    }

    const declarantEmail = requete.declarant.identite.email;
    const declarantPrenom = requete.declarant.identite.prenom || '';
    const declarantNom = requete.declarant.identite.nom || '';

    const entiteAdmin = formatEntiteAdminString(entites);
    const entiteComplete = formatEntiteCompleteString(entites);

    // TODO: Get signature/logo
    const signature = '';

    const substitutions = {
      email: declarantEmail,
      values: {
        prenomdeclarant: declarantPrenom,
        nomdeclarant: declarantNom,
        entiteadmin: entiteAdmin,
        entitecomplete: entiteComplete,
        signature,
      },
    };

    const fromAddress = envVars.TIPIMAIL_FROM_ADDRESS;
    const fromPersonalName = envVars.TIPIMAIL_FROM_PERSONAL_NAME;
    const from = {
      address: fromAddress,
      personalName: fromPersonalName,
    };

    const sentDate = new Date();

    await sendTipimailEmail({
      to: declarantEmail,
      subject: '',
      text: '',
      template: ACKNOWLEDGMENT_EMAIL_TEMPLATE_NAME,
      substitutions: [substitutions],
    });

    logger.info(
      { requeteId, declarantEmail, entiteCount: entites.length },
      'Declarant acknowledgment email sent successfully',
    );

    const topEntites = entites.filter((e) => e.entiteMereId === null);

    if (topEntites.length === 0) {
      logger.warn({ requeteId }, 'No top entities found, skipping step updates and PDF attachment');
      return;
    }

    // Update acknowledgment step automatically for top entities only
    const entiteIdsToUpdate = topEntites.map((e) => e.id);
    try {
      await updateAcknowledgmentStep(requeteId, entiteIdsToUpdate);
    } catch (stepUpdateError) {
      logger.error(
        { requeteId, error: stepUpdateError },
        'Failed to update acknowledgment step automatically, but email was sent',
      );
    }

    // Generate and attach PDF to each entity's acknowledgment step
    try {
      const emailPdf = await generateEmailPdf({
        from,
        to: declarantEmail,
        sentDate,
        template: ACKNOWLEDGMENT_EMAIL_TEMPLATE_ID,
        substitutions: substitutions.values,
      });

      // Attach PDF to each entity's acknowledgment step
      await Promise.allSettled(
        topEntites.map(async (entite) => {
          try {
            await attachEmailPdfToStep(requeteId, entite.id, emailPdf, {
              from,
              to: declarantEmail,
              sentDate,
              template: ACKNOWLEDGMENT_EMAIL_TEMPLATE_ID,
              substitutions: substitutions.values,
            });
          } catch (error) {
            logger.error({ requeteId, entiteId: entite.id, error }, 'Failed to attach email PDF to step for entity');
          }
        }),
      );
    } catch (pdfError) {
      logger.error({ requeteId, error: pdfError }, 'Failed to generate or attach email PDF');
    }

    try {
      await createChangeLog({
        entity: 'Requete',
        entityId: requeteId,
        action: ChangeLogAction.UPDATED,
        before: {},
        after: {
          acknowledgmentEmailSent: true,
          acknowledgmentEmailTemplate: ACKNOWLEDGMENT_EMAIL_TEMPLATE_NAME,
          acknowledgmentEmailSentAt: new Date().toISOString(),
          acknowledgmentEmailRecipient: declarantEmail,
          acknowledgmentEmailEntites: entites.map((e) => e.nomComplet),
        },
        changedById: null, // System action
      });
    } catch (changelogError) {
      logger.error({ requeteId, error: changelogError }, 'Failed to create changelog entry for acknowledgment email');
    }
  } catch (error) {
    logger.error({ requeteId, error }, 'Failed to send declarant acknowledgment email');
  }
}
