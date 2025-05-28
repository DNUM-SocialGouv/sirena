import { envVars } from '@/config/env';
export const scopes = ['uid', 'openid', 'given_name', 'usual_name', 'siret', 'email', 'organizational_unit'].join(' ');

export const authorizationParams = {
  redirect_uri: envVars.PC_REDIRECT_URI,
  scope: scopes,
  login_hint: '',
  acr_values: ['eidas1'],
  claims: {
    id_token: {
      amr: {
        essential: true,
      },
    },
  },
};
