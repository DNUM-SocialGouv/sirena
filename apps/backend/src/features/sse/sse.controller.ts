import { throwHTTPException404NotFound } from '@sirena/backend-utils/helpers';
import { ROLES, ROLES_READ, SSE_EVENT_TYPES } from '@sirena/common/constants';
import factoryWithRole from '../../helpers/factories/appWithRole.js';
import {
  createSSEHandler,
  createSSEStream,
  type FileStatusEvent,
  type RequeteUpdatedEvent,
  requireTopEntiteId,
  requireUserId,
  type UserListEvent,
  type UserStatusEvent,
} from '../../helpers/sse.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import entitesMiddleware from '../../middlewares/entites.middleware.js';
import roleMiddleware from '../../middlewares/role.middleware.js';
import userStatusMiddleware from '../../middlewares/userStatus.middleware.js';
import { getRequeteEntiteById } from '../requetesEntite/requetesEntite.service.js';
import { getUploadedFileById } from '../uploadedFiles/uploadedFiles.service.js';

const app = factoryWithRole
  .createApp()
  .use(authMiddleware)
  .use(entitesMiddleware)

  .get(
    '/profile',
    createSSEHandler<UserStatusEvent>({
      eventType: SSE_EVENT_TYPES.USER_STATUS,
      getFilter: (c) => {
        const userId = requireUserId(c);
        return (event) => event.userId === userId;
      },
      logContext: { endpoint: 'profile' },
    }),
  )

  .use(userStatusMiddleware)
  .use(roleMiddleware([...ROLES_READ]))

  .get(
    '/requetes',
    createSSEHandler<RequeteUpdatedEvent>({
      eventType: SSE_EVENT_TYPES.REQUETE_UPDATED,
      getFilter: (c) => {
        const topEntiteId = requireTopEntiteId(c);
        return (event) => event.entiteId === topEntiteId;
      },
      logContext: { endpoint: 'requetes' },
    }),
  )

  .get('/requetes/:id', async (c) => {
    const { id } = c.req.param();
    const topEntiteId = requireTopEntiteId(c);

    const requeteEntite = await getRequeteEntiteById(id, topEntiteId);
    if (!requeteEntite) {
      throwHTTPException404NotFound('Requete not found', { res: c.res });
    }

    const logger = c.get('logger');
    logger.info({ endpoint: 'requetes/:id', requeteId: id }, 'SSE: Client subscribed');

    return createSSEStream<RequeteUpdatedEvent>(c, {
      eventType: SSE_EVENT_TYPES.REQUETE_UPDATED,
      filter: (event) => event.requeteId === id && event.entiteId === topEntiteId,
    });
  })

  .get('/files/:id', async (c) => {
    const { id } = c.req.param();
    const topEntiteId = requireTopEntiteId(c);

    const uploadedFile = await getUploadedFileById(id, [topEntiteId]);
    if (!uploadedFile) {
      throwHTTPException404NotFound('Uploaded file not found', { res: c.res });
    }

    const logger = c.get('logger');
    logger.info({ endpoint: 'files/:id', fileId: id }, 'SSE: Client subscribed');

    return createSSEStream<FileStatusEvent>(c, {
      eventType: SSE_EVENT_TYPES.FILE_STATUS,
      filter: (event) => event.fileId === id && event.entiteId === topEntiteId,
    });
  })

  .use(roleMiddleware([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]))

  .get(
    '/users',
    createSSEHandler<UserListEvent>({
      eventType: SSE_EVENT_TYPES.USER_LIST,
      getFilter: () => undefined,
      logContext: { endpoint: 'users' },
    }),
  );

export default app;
