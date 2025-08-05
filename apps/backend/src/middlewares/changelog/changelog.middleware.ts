import type { Context } from 'hono';
import { createChangeLog } from '@/features/changelog/changelog.service';
import { ChangeLogAction } from '@/features/changelog/changelog.type';
import type { AppBindings } from '@/helpers/factories/appWithAuth';
import factoryWithAuth from '@/helpers/factories/appWithAuth';
import { isEqual, pick } from '@/helpers/object';
import type { Prisma } from '@/libs/prisma';

interface ChangelogConfig<T> {
  entity: string;
  getEntityById: (c: Context<AppBindings>) => Promise<T | null>;
  getEntityId: (c: Context<AppBindings>) => string;
  trackedFields?: (keyof T)[];
}

const createChangelogMiddleware = <T extends Record<string, unknown>>(config: ChangelogConfig<T>) => {
  return factoryWithAuth.createMiddleware(async (c, next) => {
    const entityId = config.getEntityId(c);
    const changedById = c.get('userId');

    const entityBefore = await config.getEntityById(c);

    if (!entityBefore) {
      return await next();
    }

    await next();

    if (changedById) {
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
            action: ChangeLogAction.UPDATED,
            before: beforePicked as Prisma.JsonObject,
            after: afterPicked as Prisma.JsonObject,
            changedById,
          });
        }
      }
    }
  });
};

export default createChangelogMiddleware;
