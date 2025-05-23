import { envVars } from '@//config/env.ts';

export const createRedirectUrl = ({ error, errorDescription }: { error: string; errorDescription?: string }) => {
  const url = new URL(envVars.FRONTEND_REDIRECT_LOGIN_URI);
  url.searchParams.set('error', error);
  if (errorDescription) {
    url.searchParams.set('error_description', errorDescription);
  }
  return url;
};
