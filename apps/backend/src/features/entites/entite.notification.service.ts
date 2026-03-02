import { envVars } from '../../config/env.js';
import { DGCS_FALLBACK_EMAIL, NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME } from '../../config/tipimail.constant.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { sendTipimailEmail } from '../../libs/mail/tipimail.js';
import { prisma } from '../../libs/prisma.js';

async function fetchEntiteRegionParent(id: string) {
  return prisma.entite.findUnique({
    where: { id },
    select: { regionCode: true, entiteMereId: true },
  });
}

/** Returns the region code of the root entity (walks up entiteMereId). */
async function getRegionCodeForEntite(entiteId: string): Promise<string | null> {
  let currentId: string | null = entiteId;
  while (currentId) {
    const entite = await fetchEntiteRegionParent(currentId);
    if (!entite) return null;
    if (entite.entiteMereId === null) return entite.regionCode;
    currentId = entite.entiteMereId;
  }
  return null;
}

/**
 * Resolves notification email for an entity: its email, or fallback when no email / not yet active.
 * - CD without email → ARS of the region (if ARS has email), else DGCS
 * - ARS without email (including when used as fallback for a CD) → DGCS
 * - DD without email → DGCS
 */
async function resolveNotificationEmail(entite: {
  id: string;
  nomComplet: string;
  email: string | null;
  entiteTypeId: string;
  regionCode: string | null;
}): Promise<{ email: string; fallback?: string } | null> {
  if (entite.email?.trim()) {
    return { email: entite.email.trim() };
  }
  if (entite.entiteTypeId === 'CD') {
    const regionCode = entite.regionCode ?? (await getRegionCodeForEntite(entite.id));
    if (regionCode) {
      const ars = await prisma.entite.findFirst({
        where: {
          entiteTypeId: 'ARS',
          entiteMereId: null,
          regionCode,
          isActive: true,
          email: { not: '' },
        },
        select: { email: true },
      });
      if (ars?.email?.trim()) return { email: ars.email.trim(), fallback: 'ARS' };
    }
    return { email: DGCS_FALLBACK_EMAIL, fallback: 'DGCS' };
  }
  if (entite.entiteTypeId === 'DD') {
    return { email: DGCS_FALLBACK_EMAIL, fallback: 'DGCS' };
  }
  if (entite.entiteTypeId === 'ARS') {
    return { email: DGCS_FALLBACK_EMAIL, fallback: 'DGCS' };
  }
  return null;
}

export async function sendEntiteAssignedNotification(requeteId: string, entiteIds: string[]): Promise<void> {
  const logger = getLoggerStore();

  if (entiteIds.length === 0) {
    return;
  }

  const entites = await prisma.entite.findMany({
    where: {
      id: { in: entiteIds },
    },
    select: {
      id: true,
      nomComplet: true,
      email: true,
      entiteTypeId: true,
      regionCode: true,
    },
  });

  const lienDetailsRequeteSirena = `${envVars.FRONTEND_URI}/request/${requeteId}`;

  for (const entite of entites) {
    const resolved = await resolveNotificationEmail(entite);
    if (!resolved) {
      logger.warn(
        { requeteId, entiteId: entite.id, nomEntite: entite.nomComplet, entiteTypeId: entite.entiteTypeId },
        'Entity has no email and no fallback (type not CD/DD/ARS), skipping assignment notification',
      );
      continue;
    }

    try {
      const substitutions = {
        email: resolved.email,
        values: {
          numeroRequete: requeteId,
          entite: entite.nomComplet,
          lienDetailsRequeteSirena,
          signature: '',
        },
      };

      await sendTipimailEmail({
        to: resolved.email,
        subject: '',
        text: '',
        template: NOTIFICATION_ENTITE_AFFECTATION_TEMPLATE_NAME,
        substitutions: [substitutions],
      });

      logger.info(
        {
          requeteId,
          entiteId: entite.id,
          recipientEmail: resolved.email,
          ...(resolved.fallback && { fallback: resolved.fallback }),
        },
        'Entity assignment notification email sent',
      );
    } catch (err) {
      logger.error({ requeteId, entiteId: entite.id, err }, 'Failed to send entity assignment notification email');
    }
  }
}
