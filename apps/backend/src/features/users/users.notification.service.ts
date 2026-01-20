import { ROLES, type Role, roles, STATUT_TYPES } from '@sirena/common/constants';
import { envVars } from '../../config/env.js';
import { createChangeLog } from '../../features/changelog/changelog.service.js';
import { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getEntiteChain } from '../../features/entites/entites.service.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { prisma } from '../../libs/prisma.js';
import { sendTipimailEmail } from '../../libs/tipimail.js';

/**
 * Builds the entite chain string (e.g., "ARS Normandie - Direction de l'Autonomie - UA 14")
 */
async function buildEntiteChainString(entiteId: string | null): Promise<string> {
  if (!entiteId) {
    return '';
  }

  const chain = await getEntiteChain(entiteId);
  return chain.map((entite) => entite.nomComplet).join(' - ');
}

/**
 * Sends a notification email when a user account is activated
 * @param userId - The ID of the user whose account was activated
 * @param changedById - Optional ID of the user who triggered the activation (for changelog)
 */
export async function sendUserActivationEmail(userId: string, changedById?: string | null): Promise<void> {
  const logger = getLoggerStore();
  const getTemplateForRole = (roleId: Role): string | null => {
    switch (roleId) {
      case ROLES.SUPER_ADMIN:
      case ROLES.ENTITY_ADMIN:
        return 'habilitation-admin-local';
      case ROLES.WRITER:
        return 'habilitation-agent-en-ecriture';
      case ROLES.READER:
        return 'habilitation-agent-en-lecture';
      case ROLES.NATIONAL_STEERING:
        return 'habilitation-pilotage-national';
      default:
        return null;
    }
  };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        entite: true,
      },
    });

    if (!user) {
      logger.warn({ userId }, 'User not found for activation email');
      return;
    }

    if (user.statutId !== STATUT_TYPES.ACTIF) {
      logger.debug({ userId, statutId: user.statutId }, 'User is not ACTIF, skipping activation email');
      return;
    }

    if (!user.email) {
      logger.warn({ userId }, 'User has no email, cannot send activation email');
      return;
    }

    const template = getTemplateForRole(user.roleId as Role);

    if (!template) {
      logger.warn({ userId, roleId: user.roleId }, 'User has no template, cannot send activation email');
      return;
    }

    const roleLabel = roles[user.roleId as Role] || user.roleId;

    const entiteString = await buildEntiteChainString(user.entiteId);

    const sirenaUrl = envVars.FRONTEND_URI;

    const substitutions = {
      email: user.email,
      values: {
        prenom: user.prenom,
        nom: user.nom,
        role: roleLabel,
        entite: entiteString,
        urlsirena: sirenaUrl,
        signature: '', // TODO: handle signature/logo
      },
    };

    await sendTipimailEmail({
      to: user.email,
      subject: '',
      text: '',
      template,
      substitutions: [substitutions],
    });

    logger.info({ userId, email: user.email, template }, 'Activation email sent successfully');

    try {
      await createChangeLog({
        entity: 'User',
        entityId: userId,
        action: ChangeLogAction.UPDATED,
        before: {},
        after: {
          activationEmailSent: true,
          activationEmailTemplate: template,
          activationEmailSentAt: new Date().toISOString(),
        },
        changedById: changedById ?? null,
      });
    } catch (changelogError) {
      logger.error({ userId, error: changelogError }, 'Failed to create changelog entry for activation email');
    }
  } catch (error) {
    console.log(error);
    logger.error({ userId, error }, 'Failed to send activation email');
  }
}
