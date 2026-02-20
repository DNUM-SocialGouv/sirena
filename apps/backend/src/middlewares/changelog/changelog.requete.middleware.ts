import { createChangeLog } from '../../features/changelog/changelog.service.js';
import { ChangeLogAction } from '../../features/changelog/changelog.type.js';
import { getRequeteEntiteById } from '../../features/requetesEntite/requetesEntite.service.js';
import factoryWithChangelog from '../../helpers/factories/appWithChangeLog.js';
import { isEqual, pick } from '../../helpers/object.js';
import type { Adresse, Identite, PersonneConcernee, Prisma, Requete } from '../../libs/prisma.js';

const personneTrackedFields: (keyof PersonneConcernee)[] = [
  'estNonIdentifiee',
  'estHandicapee',
  'estIdentifie',
  'estVictime',
  'estVictimeInformee',
  'victimeInformeeCommentaire',
  'veutGarderAnonymat',
  'estSignalementProfessionnel',
  'commentaire',
  'autrePersonnes',
  'aAutrePersonnes',
  'ageId',
  'dateNaissance',
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
const requeteTrackedFields: (keyof Requete)[] = [
  'id',
  'commentaire',
  'receptionDate',
  'dematSocialId',
  'receptionTypeId',
  'provenanceId',
  'provenancePrecision',
  'createdAt',
  'updatedAt',
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
    const topEntiteId = c.get('topEntiteId');

    if (!topEntiteId) {
      logger.error(
        {
          topEntiteId,
        },
        'requeteChangelogMiddleware: Top entite ID is required. Skipping changelog.',
      );
      return await next();
    }

    if (!requeteId && action === 'UPDATED') {
      logger.error(
        {
          requeteId,
        },
        'requeteChangelogMiddleware: Requete ID is required. Skipping changelog.',
      );
      return await next();
    }

    let declarantBefore: PersonneConcernee | null = null;
    let declarantIdentiteBefore: Identite | null = null;
    let declarantAdresseBefore: Adresse | null = null;
    let participantBefore: PersonneConcernee | null = null;
    let participantIdentiteBefore: Identite | null = null;
    let participantAdresseBefore: Adresse | null = null;
    let requeteBefore: Requete | null = null;

    if (action === 'UPDATED' && requeteId) {
      const requeteEntite = await getRequeteEntiteById(requeteId, topEntiteId);
      if (requeteEntite?.requete) {
        requeteBefore = requeteEntite.requete;
      }

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

    // Call route/controller
    await next();

    // In case of CREATED action, the changelogId is set in the controller with created requete ID
    // In case of UPDATED action, the changelogId is set in the controller with updated declarant or participant ID
    const changelogId = c.get('changelogId');

    // Helper function to create changelog for an entity
    const createEntityChangelog = async (
      entity: 'PersonneConcernee' | 'Identite' | 'Adresse' | 'Requete',
      entityId: string,
      action: ChangeLogAction,
      before: Prisma.JsonObject | null,
      after: Prisma.JsonObject | null,
    ) => {
      await createChangeLog({
        entity,
        entityId,
        action,
        before,
        after,
        changedById,
      });
    };

    // Helper function to check if there are changes between before and after data
    const hasChanges = (before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]) => {
      return fields.some((field) => {
        const beforeValue = before[field];
        const afterValue = after[field];
        return !isEqual(beforeValue, afterValue);
      });
    };

    // Helper function to handle entity changes (UPDATED action)
    const handleEntityChanges = async (
      entity: 'PersonneConcernee' | 'Identite' | 'Adresse' | 'Requete',
      entityId: string,
      before: Record<string, unknown> | null,
      after: Record<string, unknown> | null,
      trackedFields: string[],
    ) => {
      if (!before || !after) return;

      const beforePicked = pick(before, trackedFields);
      const afterPicked = pick(after, trackedFields);

      if (hasChanges(beforePicked, afterPicked, trackedFields)) {
        await createEntityChangelog(
          entity,
          entityId,
          action,
          beforePicked as unknown as Prisma.JsonObject,
          afterPicked as unknown as Prisma.JsonObject,
        );
      }
    };

    // Helper function to check if data has meaningful values (not empty strings, null, undefined, or false)
    const hasMeaningfulData = (data: Record<string, unknown>, fields: string[]): boolean => {
      return fields.some((field) => {
        const value = data[field];
        if (value === null || value === undefined || value === '' || value === false) {
          return false;
        }
        return true;
      });
    };

    // Helper function to handle entity creation (CREATED action)
    const handleEntityCreation = async (
      entity: 'PersonneConcernee' | 'Identite' | 'Adresse' | 'Requete',
      entityId: string,
      data: Record<string, unknown>,
      trackedFields: string[],
    ) => {
      const pickedData = pick(data, trackedFields);

      // Skip changelog creation if all tracked fields are empty
      if (!hasMeaningfulData(pickedData, trackedFields)) {
        return;
      }

      await createEntityChangelog(
        entity,
        entityId,
        ChangeLogAction.CREATED,
        null,
        pickedData as unknown as Prisma.JsonObject,
      );
    };

    if (!changelogId || !changedById) return;

    // Scenario 1: CREATED action (new requete with declarant/participant)
    if (action === 'CREATED') {
      const requeteEntite = await getRequeteEntiteById(changelogId, topEntiteId);

      // Handle requete creation
      if (requeteEntite?.requete) {
        await handleEntityCreation('Requete', requeteEntite.requete.id, requeteEntite.requete, requeteTrackedFields);
      }

      // Handle declarant creation
      if (requeteEntite?.requete?.declarant) {
        const declarant = requeteEntite.requete.declarant;
        await handleEntityCreation('PersonneConcernee', declarant.id, declarant, personneTrackedFields);

        if (declarant.identite) {
          await handleEntityCreation('Identite', declarant.identite.id, declarant.identite, identiteTrackedFields);
        }

        if (declarant.adresse) {
          await handleEntityCreation('Adresse', declarant.adresse.id, declarant.adresse, adresseTrackedFields);
        }
      }

      // Handle participant creation
      if (requeteEntite?.requete?.participant) {
        const participant = requeteEntite.requete.participant;
        await handleEntityCreation('PersonneConcernee', participant.id, participant, personneTrackedFields);

        if (participant.identite) {
          await handleEntityCreation('Identite', participant.identite.id, participant.identite, identiteTrackedFields);
        }

        if (participant.adresse) {
          await handleEntityCreation('Adresse', participant.adresse.id, participant.adresse, adresseTrackedFields);
        }
      }
    }

    // Scenario 2: UPDATED action (modify existing declarant/participant)
    if (action === 'UPDATED' && requeteId) {
      const requeteEntite = await getRequeteEntiteById(requeteId, topEntiteId);

      // Handle declarant updates
      if (declarantBefore && requeteEntite?.requete?.declarant) {
        const declarantAfter = requeteEntite.requete.declarant;
        await handleEntityChanges(
          'PersonneConcernee',
          changelogId,
          declarantBefore,
          declarantAfter,
          personneTrackedFields,
        );

        // Handle identity updates for existing declarant
        if (declarantIdentiteBefore && declarantAfter.identite) {
          await handleEntityChanges(
            'Identite',
            declarantAfter.identite.id,
            declarantIdentiteBefore,
            declarantAfter.identite,
            identiteTrackedFields,
          );
        }

        // Handle new identity creation for existing declarant
        if (!declarantIdentiteBefore && declarantAfter.identite) {
          await handleEntityCreation(
            'Identite',
            declarantAfter.identite.id,
            declarantAfter.identite,
            identiteTrackedFields,
          );
        }

        // Handle address updates for existing declarant
        if (declarantAdresseBefore && declarantAfter.adresse) {
          await handleEntityChanges(
            'Adresse',
            declarantAfter.adresse.id,
            declarantAdresseBefore,
            declarantAfter.adresse,
            adresseTrackedFields,
          );
        }

        // Handle new address creation for existing declarant
        if (!declarantAdresseBefore && declarantAfter.adresse) {
          await handleEntityCreation(
            'Adresse',
            declarantAfter.adresse.id,
            declarantAfter.adresse,
            adresseTrackedFields,
          );
        }
      }

      // Handle participant updates
      if (participantBefore && requeteEntite?.requete?.participant) {
        const participantAfter = requeteEntite.requete.participant;
        await handleEntityChanges(
          'PersonneConcernee',
          changelogId,
          participantBefore,
          participantAfter,
          personneTrackedFields,
        );

        // Handle identity updates for existing participant
        if (participantIdentiteBefore && participantAfter.identite) {
          await handleEntityChanges(
            'Identite',
            participantAfter.identite.id,
            participantIdentiteBefore,
            participantAfter.identite,
            identiteTrackedFields,
          );
        }

        // Handle new identity creation for existing participant
        if (!participantIdentiteBefore && participantAfter.identite) {
          await handleEntityCreation(
            'Identite',
            participantAfter.identite.id,
            participantAfter.identite,
            identiteTrackedFields,
          );
        }

        // Handle address updates for existing participant
        if (participantAdresseBefore && participantAfter.adresse) {
          await handleEntityChanges(
            'Adresse',
            participantAfter.adresse.id,
            participantAdresseBefore,
            participantAfter.adresse,
            adresseTrackedFields,
          );
        }

        // Handle new address creation for existing participant
        if (!participantAdresseBefore && participantAfter.adresse) {
          await handleEntityCreation(
            'Adresse',
            participantAfter.adresse.id,
            participantAfter.adresse,
            adresseTrackedFields,
          );
        }
      }

      // Handle new declarant creation on existing requete
      if (!declarantBefore && requeteEntite?.requete?.declarant) {
        const declarant = requeteEntite.requete.declarant;
        await handleEntityCreation('PersonneConcernee', declarant.id, declarant, personneTrackedFields);

        if (declarant.identite) {
          await handleEntityCreation('Identite', declarant.identite.id, declarant.identite, identiteTrackedFields);
        }

        if (declarant.adresse) {
          await handleEntityCreation('Adresse', declarant.adresse.id, declarant.adresse, adresseTrackedFields);
        }
      }

      // Handle new participant creation on existing requete
      if (!participantBefore && requeteEntite?.requete?.participant) {
        const participant = requeteEntite.requete.participant;
        await handleEntityCreation('PersonneConcernee', participant.id, participant, personneTrackedFields);

        if (participant.identite) {
          await handleEntityCreation('Identite', participant.identite.id, participant.identite, identiteTrackedFields);
        }

        if (participant.adresse) {
          await handleEntityCreation('Adresse', participant.adresse.id, participant.adresse, adresseTrackedFields);
        }
      }

      if (changelogId === requeteId && requeteBefore) {
        const requeteEntiteAfter = await getRequeteEntiteById(requeteId, topEntiteId);
        if (requeteEntiteAfter?.requete) {
          await handleEntityChanges(
            'Requete',
            requeteId,
            requeteBefore,
            requeteEntiteAfter.requete,
            requeteTrackedFields as string[],
          );
        }
      }
    }
  });
};

export default requeteChangelogMiddleware;
