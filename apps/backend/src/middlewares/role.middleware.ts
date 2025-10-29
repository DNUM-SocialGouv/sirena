import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import type { Role } from '@sirena/common/constants';
import factoryWithAuth from '@/helpers/factories/appWithAuth';

const app = (roles: Role[]) =>
  factoryWithAuth.createMiddleware(async (c, next) => {
    const userRole = c.get('roleId') as Role;

    if (!userRole || !roles.includes(userRole)) {
      throwHTTPException403Forbidden('Forbidden, you do not have the required role to access this resource', {
        res: c.res,
      });
    }

    return next();
  });

export default app;
