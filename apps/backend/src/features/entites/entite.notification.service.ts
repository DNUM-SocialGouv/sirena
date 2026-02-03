import { envVars } from '../../config/env.js';
import { NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME } from '../../config/tipimail.constant.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { prisma } from '../../libs/prisma.js';

export async function sendEntiteAssignedNotification(requeteId: string, entiteIds: string[]): Promise<void> {
  const logger = getLoggerStore();

  if (entiteIds.length === 0) {
    return;
  }

  const entites = await prisma.entite.findMany({
    where: {
      id: { in: entiteIds },
      isActive: true,
    },
    select: {
      id: true,
      nomComplet: true,
      email: true,
    },
  });

  const entitesWithEmail = entites.filter((e) => Boolean(e.email?.trim()));

  for (const entite of entites) {
    if (!entite.email?.trim()) {
      logger.warn(
        { requeteId, entiteId: entite.id, nomEntite: entite.nomComplet },
        'Entity has no generic email, skipping assignment notification',
      );
    }
  }

  if (entitesWithEmail.length === 0) {
    return;
  }

  const lienDetailsRequeteSirena = `${envVars.FRONTEND_URI}/request/${requeteId}`;

  for (const entite of entitesWithEmail) {
    try {
      const substitutions = {
        email: entite.email,
        values: {
          numeroRequete: requeteId,
          entite: entite.nomComplet,
          lienDetailsRequeteSirena,
          signature: '',
        },
      };

      await sendTipimailEmail({
        to: entite.email,
        subject: '',
        text: '',
        template: NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME,
        substitutions: [substitutions],
      });

      logger.info(
        { requeteId, entiteId: entite.id, entiteEmail: entite.email },
        'Entity assignment notification email sent',
      );
    } catch (err) {
      logger.error({ requeteId, entiteId: entite.id, err }, 'Failed to send entity assignment notification email');
    }
  }
}
