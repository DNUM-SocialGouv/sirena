import { createChangeLog } from '@/features/changelog/changelog.service';
import type { ChangeLogAction } from '@/features/changelog/changelog.type';
import { getRequeteEntiteById } from '@/features/requetesEntite/requetesEntite.service';
import factoryWithChangelog from '@/helpers/factories/appWithChangeLog';
import { isEqual, pick } from '@/helpers/object';
import type { Adresse, Identite, PersonneConcernee, Prisma } from '@/libs/prisma';

const personneTrackedFields: (keyof PersonneConcernee)[] = [
  'estNonIdentifiee',
  'estAnonyme',
  'estHandicapee',
  'estIdentifie',
  'estVictime',
  'estVictimeInformee',
  'victimeInformeeCommentaire',
  'veutGarderAnonymat',
  'commentaire',
  'autrePersonnes',
  'ageId',
  'lienVictimeId',
  'lienAutrePrecision',
];
const identiteTrackedFields: (keyof Identite)[] = [
  'prenom',
  'nom',
  'email',
  'telephone',
  'commentaire',
  'civiliteId',
  'personneConcerneeId',
];
const adresseTrackedFields: (keyof Adresse)[] = [
  'label',
  'numero',
  'rue',
  'codePostal',
  'ville',
  'personneConcerneeId',
  'lieuDeSurvenueId',
];

type RequeteChangelogMiddleware = {
  action: ChangeLogAction;
};

/** NOTE: This middleware can only log changes for ONE entity at a time for UPDATED action (e.g. "/:id/declarant" OR "/:id/participant")
 * If a route needs to update both declarant and participant simultaneously,
 * it's not possible with the current architecture as we can only set one changelogId
 */
const requeteChangelogMiddleware = ({ action }: RequeteChangelogMiddleware) => {
  return factoryWithChangelog.createMiddleware(async (c, next) => {
    const changedById = c.get('userId');
    const requeteId = c.req.param('id');
    const logger = c.get('logger');
    const entiteIds = c.get('entiteIds');

    if (!requeteId) {
      logger.error('requeteChangelogMiddleware: Requete ID is required. Skipping changelog.', {
        requeteId,
      });
      return await next();
    }

    let declarantBefore: PersonneConcernee | null = null;
    let declarantIdentiteBefore: Identite | null = null;
    let declarantAdresseBefore: Adresse | null = null;
    let participantBefore: PersonneConcernee | null = null;
    let participantIdentiteBefore: Identite | null = null;
    let participantAdresseBefore: Adresse | null = null;

    if (action !== 'CREATED') {
      const requeteEntite = await getRequeteEntiteById(requeteId, entiteIds);

      if (requeteEntite?.requete?.declarant) {
        declarantBefore = requeteEntite.requete.declarant;
        declarantIdentiteBefore = requeteEntite.requete.declarant.identite;
        declarantAdresseBefore = requeteEntite.requete.declarant.adresse;
      }

      if (requeteEntite?.requete?.participant) {
        participantBefore = requeteEntite.requete.participant;
        participantIdentiteBefore = requeteEntite.requete.participant.identite;
        participantAdresseBefore = requeteEntite.requete.participant.adresse;
      }
    }

    await next();

    const changelogId = c.get('changelogId');

    // Handle declarant updated changelog
    if (changelogId && changedById && action === 'UPDATED' && declarantBefore) {
      const requeteEntite = await getRequeteEntiteById(requeteId, entiteIds);

      if (requeteEntite?.requete?.declarant) {
        const declarantAfter = requeteEntite.requete.declarant;
        const identiteAfter = requeteEntite.requete.declarant.identite;
        const adresseAfter = requeteEntite.requete.declarant.adresse;

        const declarantBeforePicked = pick(declarantBefore, personneTrackedFields);
        const declarantAfterPicked = pick(declarantAfter, personneTrackedFields);

        const hasDeclarantChanges = personneTrackedFields.some((field) => {
          const before = declarantBeforePicked[field];
          const after = declarantAfterPicked[field];
          return !isEqual(before, after);
        });

        if (hasDeclarantChanges) {
          await createChangeLog({
            entity: 'PersonneConcernee',
            entityId: changelogId,
            action,
            before: declarantBeforePicked as unknown as Prisma.JsonObject,
            after: declarantAfterPicked as unknown as Prisma.JsonObject,
            changedById,
          });
        }

        if (declarantIdentiteBefore && identiteAfter) {
          const identiteBeforePicked = pick(declarantIdentiteBefore, identiteTrackedFields);
          const identiteAfterPicked = pick(identiteAfter, identiteTrackedFields);

          const hasIdentiteChanges = identiteTrackedFields.some((field) => {
            const before = identiteBeforePicked[field];
            const after = identiteAfterPicked[field];
            return !isEqual(before, after);
          });

          if (hasIdentiteChanges) {
            await createChangeLog({
              entity: 'Identite',
              entityId: identiteAfter.id,
              action,
              before: identiteBeforePicked as unknown as Prisma.JsonObject,
              after: identiteAfterPicked as unknown as Prisma.JsonObject,
              changedById,
            });
          }
        }

        if (declarantAdresseBefore && adresseAfter) {
          const adresseBeforePicked = pick(declarantAdresseBefore, adresseTrackedFields);
          const adresseAfterPicked = pick(adresseAfter, adresseTrackedFields);

          const hasAdresseChanges = adresseTrackedFields.some((field) => {
            const before = adresseBeforePicked[field];
            const after = adresseAfterPicked[field];
            return !isEqual(before, after);
          });

          if (hasAdresseChanges) {
            await createChangeLog({
              entity: 'Adresse',
              entityId: adresseAfter.id,
              action,
              before: adresseBeforePicked as unknown as Prisma.JsonObject,
              after: adresseAfterPicked as unknown as Prisma.JsonObject,
              changedById,
            });
          }
        }
      }
    } else if (changedById && action === 'CREATED') {
      // Handle both declarant and participant creation
      const requeteEntite = await getRequeteEntiteById(requeteId, entiteIds);

      // Handle declarant creation
      if (requeteEntite?.requete?.declarant) {
        const declarant = requeteEntite.requete.declarant;

        const declarantData = pick(declarant, personneTrackedFields);

        await createChangeLog({
          entity: 'PersonneConcernee',
          entityId: declarant.id,
          action,
          before: null,
          after: declarantData as unknown as Prisma.JsonObject,
          changedById,
        });

        if (declarant.identite) {
          const identiteData = pick(declarant.identite, identiteTrackedFields);
          await createChangeLog({
            entity: 'Identite',
            entityId: declarant.identite.id,
            action,
            before: null,
            after: identiteData as unknown as Prisma.JsonObject,
            changedById,
          });
        }

        if (declarant.adresse) {
          const adresseData = pick(declarant.adresse, adresseTrackedFields);
          await createChangeLog({
            entity: 'Adresse',
            entityId: declarant.adresse.id,
            action,
            before: null,
            after: adresseData as unknown as Prisma.JsonObject,
            changedById,
          });
        }
      }

      // Handle participant creation
      if (requeteEntite?.requete?.participant) {
        const participant = requeteEntite.requete.participant;

        const participantData = pick(participant, personneTrackedFields);

        await createChangeLog({
          entity: 'PersonneConcernee',
          entityId: participant.id,
          action,
          before: null,
          after: participantData as unknown as Prisma.JsonObject,
          changedById,
        });

        if (participant.identite) {
          const identiteData = pick(participant.identite, identiteTrackedFields);
          await createChangeLog({
            entity: 'Identite',
            entityId: participant.identite.id,
            action,
            before: null,
            after: identiteData as unknown as Prisma.JsonObject,
            changedById,
          });
        }

        if (participant.adresse) {
          const adresseData = pick(participant.adresse, adresseTrackedFields);
          await createChangeLog({
            entity: 'Adresse',
            entityId: participant.adresse.id,
            action,
            before: null,
            after: adresseData as unknown as Prisma.JsonObject,
            changedById,
          });
        }
      }
    }

    // Handle participant changelog for UPDATED
    if (changelogId && changedById && action === 'UPDATED' && participantBefore) {
      const requeteEntite = await getRequeteEntiteById(requeteId, entiteIds);

      if (requeteEntite?.requete?.participant) {
        const participantAfter = requeteEntite.requete.participant;
        const identiteAfter = requeteEntite.requete.participant.identite;
        const adresseAfter = requeteEntite.requete.participant.adresse;

        const participantBeforePicked = pick(participantBefore, personneTrackedFields);
        const participantAfterPicked = pick(participantAfter, personneTrackedFields);

        const hasParticipantChanges = personneTrackedFields.some((field) => {
          const before = participantBeforePicked[field];
          const after = participantAfterPicked[field];
          return !isEqual(before, after);
        });

        if (hasParticipantChanges) {
          await createChangeLog({
            entity: 'PersonneConcernee',
            entityId: changelogId,
            action,
            before: participantBeforePicked as unknown as Prisma.JsonObject,
            after: participantAfterPicked as unknown as Prisma.JsonObject,
            changedById,
          });
        }

        if (participantIdentiteBefore && identiteAfter) {
          const identiteBeforePicked = pick(participantIdentiteBefore, identiteTrackedFields);
          const identiteAfterPicked = pick(identiteAfter, identiteTrackedFields);

          const hasIdentiteChanges = identiteTrackedFields.some((field) => {
            const before = identiteBeforePicked[field];
            const after = identiteAfterPicked[field];
            return !isEqual(before, after);
          });

          if (hasIdentiteChanges) {
            await createChangeLog({
              entity: 'Identite',
              entityId: identiteAfter.id,
              action,
              before: identiteBeforePicked as unknown as Prisma.JsonObject,
              after: identiteAfterPicked as unknown as Prisma.JsonObject,
              changedById,
            });
          }
        }

        if (participantAdresseBefore && adresseAfter) {
          const adresseBeforePicked = pick(participantAdresseBefore, adresseTrackedFields);
          const adresseAfterPicked = pick(adresseAfter, adresseTrackedFields);

          const hasAdresseChanges = adresseTrackedFields.some((field) => {
            const before = adresseBeforePicked[field];
            const after = adresseAfterPicked[field];
            return !isEqual(before, after);
          });

          if (hasAdresseChanges) {
            await createChangeLog({
              entity: 'Adresse',
              entityId: adresseAfter.id,
              action,
              before: adresseBeforePicked as unknown as Prisma.JsonObject,
              after: adresseAfterPicked as unknown as Prisma.JsonObject,
              changedById,
            });
          }
        }
      }
    }
  });
};

export default requeteChangelogMiddleware;
