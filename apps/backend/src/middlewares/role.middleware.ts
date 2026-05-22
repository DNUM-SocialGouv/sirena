import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { ERROR_KIND, type Role } from '@sirena/common/constants';
import factoryWithAuth from '../helpers/factories/appWithAuth.js';

const app = (roles: Role[]) =>
  factoryWithAuth.createMiddleware(async (c, next) => {
    const userRole = c.get('roleId') as Role;

    if (!userRole || !roles.includes(userRole)) {
      throwHTTPException403Forbidden('Forbidden, you do not have the required role to access this resource', {
        res: c.res,
        kind: ERROR_KIND.BUSINESS,
      });
    }

    return next();
  });

export default app;
