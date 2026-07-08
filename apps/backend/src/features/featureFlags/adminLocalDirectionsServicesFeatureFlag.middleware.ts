import { throwHTTPException403Forbidden } from '@sirena/backend-utils/helpers';
import { FEATURE_FLAGS } from '@sirena/common/constants';
import factoryWithAuth from '../../helpers/factories/appWithAuth.js';
import { getUserById } from '../users/users.service.js';
import { hasFeature } from './featureFlags.service.js';

const adminLocalDirectionsServicesFeatureFlagMiddleware = factoryWithAuth.createMiddleware(async (c, next) => {
  const userId = c.get('userId');
  const user = await getUserById(userId, null, null);

  const isEnabled = user
    ? await hasFeature(FEATURE_FLAGS.ADMIN_LOCAL_DIRECTIONS_SERVICES, false, user.email, user.entiteId)
    : false;

  if (!isEnabled) {
    throwHTTPException403Forbidden('Forbidden', { res: c.res });
  }

  return next();
});

export default adminLocalDirectionsServicesFeatureFlagMiddleware;
