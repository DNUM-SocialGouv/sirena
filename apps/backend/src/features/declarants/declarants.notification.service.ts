import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import { prisma } from '@/libs/prisma';
import { sendTipimailEmail } from '@/libs/tipimail';

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

    await sendTipimailEmail({
      to: declarantEmail,
      subject: '',
      text: '',
      template: 'ar-declarant',
      substitutions: [substitutions],
    });

    logger.info(
      { requeteId, declarantEmail, entiteCount: entites.length },
      'Declarant acknowledgment email sent successfully',
    );

    try {
      await createChangeLog({
        entity: 'Requete',
        entityId: requeteId,
        action: ChangeLogAction.UPDATED,
        before: {},
        after: {
          acknowledgmentEmailSent: true,
          acknowledgmentEmailTemplate: 'ar-declarant',
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
