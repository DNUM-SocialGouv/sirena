import { openApiRedirect } from '@/helpers/apiResponses.ts';

export const postLoginRoute = () => ({
  description: 'Login with redirection on proconnect',
  responses: {
    ...openApiRedirect(302, 'Redirect to proconnect'),
  },
});

export const getCallbackRoute = () => ({
  description: 'Redirection from proconnect to login',
  responses: {
    ...openApiRedirect(302, 'Redirect to frontend from proconnect'),
  },
});

export const postLogoutRoute = () => ({
  description: 'Logout from the application',
  responses: {
    ...openApiRedirect(302, 'Redirect to login page'),
  },
});

export const postLogoutProconnectRoute = () => ({
  description: 'Logout with redirection on proconnect if possible',
  responses: {
    ...openApiRedirect(302, 'Redirect to proconnect or login page if no sesssion'),
  },
});
