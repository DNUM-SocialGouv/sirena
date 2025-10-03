import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { PERMISSION_ERROR, ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { getUserById } from '@/features/users/users.service';
import factoryWithAuth from '@/helpers/factories/appWithAuth';

const userStatusMiddleware = factoryWithAuth.createMiddleware(async (c, next) => {
  const userId = c.get('userId');

  if (!userId) {
    throwHTTPException403Forbidden('Authentication required', { res: c.res });
  }

  const user = await getUserById(userId, null, null);

  if (!user) {
    throwHTTPException403Forbidden('User not found', { res: c.res });
  }

  if (
    (user.statutId === STATUT_TYPES.INACTIF || user.statutId === STATUT_TYPES.NON_RENSEIGNE) &&
    user.roleId !== ROLES.SUPER_ADMIN
  ) {
    return throwHTTPException403Forbidden('Account inactive', {
      res: c.res,
      cause: { name: PERMISSION_ERROR.ACCOUNT_INACTIVE },
    });
  }

  return next();
});

export default userStatusMiddleware;
