import { openApiRedirect } from '@/helpers/apiResponses';
import { describeRoute } from 'hono-openapi';

export const postLoginRoute = describeRoute({
  description: 'Login with redirection on proconnect',
  responses: {
    ...openApiRedirect(302, 'Redirect to proconnect'),
  },
});

export const getCallbackRoute = describeRoute({
  description: 'Redirection from proconnect to login',
  responses: {
    ...openApiRedirect(302, 'Redirect to frontend from proconnect'),
  },
});

export const postLogoutRoute = describeRoute({
  description: 'Logout from the application',
  responses: {
    ...openApiRedirect(302, 'Redirect to login page'),
  },
});

export const postLogoutProconnectRoute = describeRoute({
  description: 'Logout with redirection on proconnect if possible',
  responses: {
    ...openApiRedirect(302, 'Redirect to proconnect or login page if no sesssion'),
  },
});
