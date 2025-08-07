import type { Context } from 'hono';
import { createChangeLog } from '@/features/changelog/changelog.service';
import type { ChangeLogAction } from '@/features/changelog/changelog.type';
import type { AppBindings } from '@/helpers/factories/appWithChangeLog';
import factoryWithChangelog from '@/helpers/factories/appWithChangeLog';
import { isEqual, pick } from '@/helpers/object';
import type { Prisma } from '@/libs/prisma';

interface ChangelogConfig<T> {
  entity: string;
  action: ChangeLogAction;
  getEntityById: (c: Context<AppBindings>) => Promise<T | null>;
  getEntityId: (c: Context<AppBindings>) => string | null;
  trackedFields?: (keyof T)[];
}

const createChangelogMiddleware = <T extends Record<string, unknown>>(config: ChangelogConfig<T>) => {
  return factoryWithChangelog.createMiddleware(async (c, next) => {
    const changedById = c.get('userId');

    let entityBefore: T | null = null;
    if (config.action !== 'CREATED') {
      entityBefore = await config.getEntityById(c);
    }

    await next();

    const entityId = config.getEntityId(c) ?? 'UNKNOWN_ID';

    if (entityId === 'UNKNOWN_ID') {
      const logger = c.get('logger');
      logger.warn(
        `Changelog action "${config.action}" not handled for entity "${config.entity}" did not receive a valid entity ID`,
      );
    }

    if (changedById && config.action === 'UPDATED' && entityBefore) {
      const entityAfter = await config.getEntityById(c);

      if (entityAfter) {
        const fieldsToTrack = config.trackedFields || (Object.keys(entityBefore) as (keyof T)[]);

        const beforePicked = pick(entityBefore, fieldsToTrack);
        const afterPicked = pick(entityAfter, fieldsToTrack);

        const hasChanges = fieldsToTrack.some((field) => {
          const before = beforePicked[field];
          const after = afterPicked[field];
          return !isEqual(before, after);
        });

        if (hasChanges) {
          await createChangeLog({
            entity: config.entity,
            entityId,
            action: config.action,
            before: beforePicked as Prisma.JsonObject,
            after: afterPicked as Prisma.JsonObject,
            changedById,
          });
        }
      }
    } else if (changedById && config.action === 'CREATED') {
      const entityAfter = await config.getEntityById(c);

      if (entityAfter) {
        await createChangeLog({
          entity: config.entity,
          entityId,
          action: config.action,
          before: null,
          after: entityAfter as Prisma.JsonObject,
          changedById,
        });
      }
    } else if (changedById && config.action === 'DELETED' && entityBefore) {
      await createChangeLog({
        entity: config.entity,
        entityId,
        action: config.action,
        before: entityBefore as Prisma.JsonObject,
        after: null,
        changedById,
      });
    } else {
      const logger = c.get('logger');
      logger.warn(
        `Changelog action "${config.action}" not handled for entity "${config.entity}" with ID "${entityId}". No changes recorded.`,
      );
    }
  });
};

export default createChangelogMiddleware;
