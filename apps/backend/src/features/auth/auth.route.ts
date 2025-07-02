import { openApiRedirect } from '@sirena/backend-utils/helpers';
import { describeRoute } from 'hono-openapi';

export const postLoginRoute = describeRoute({
  description: 'Login with redirection on ProConnect',
  responses: {
    ...openApiRedirect(302, 'Redirect to ProConnect'),
  },
});

export const getCallbackRoute = describeRoute({
  description: 'Redirection from ProConnect to login',
  responses: {
    ...openApiRedirect(302, 'Redirect to frontend from ProConnect'),
  },
});

export const postLogoutRoute = describeRoute({
  description: 'Logout from the application',
  responses: {
    ...openApiRedirect(302, 'Redirect to login page'),
  },
});

export const postLogoutProconnectRoute = describeRoute({
  description: 'Logout with redirection on ProConnect if possible',
  responses: {
    ...openApiRedirect(302, 'Redirect to ProConnect or login page if no sesssion'),
  },
});
