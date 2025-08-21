import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { STATUT_TYPES } from '@sirena/common/constants';
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

  if (user.statutId === STATUT_TYPES.INACTIF || user.statutId === STATUT_TYPES.NON_RENSEIGNE) {
    c.res.headers.set('X-Error-Code', 'ACCOUNT_INACTIVE');
    return throwHTTPException403Forbidden('Account inactive', { res: c.res });
  }

  return next();
});

export default userStatusMiddleware;
