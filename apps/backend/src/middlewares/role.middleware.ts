import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import type { ROLES } from '@sirena/common/constants';
import factoryWithAuth from '@/helpers/factories/appWithAuth';

const app = (roles: (keyof typeof ROLES)[]) =>
  factoryWithAuth.createMiddleware(async (c, next) => {
    const userRole = c.get('roleId') as keyof typeof ROLES;

    if (!userRole || !roles.includes(userRole)) {
      return throwHTTPException403Forbidden('Forbidden, you do not have the required role to access this resource');
    }

    return next();
  });

export default app;
