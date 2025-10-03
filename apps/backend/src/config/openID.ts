import { envVars } from '@/config/env';
export const scopes = ['uid', 'openid', 'given_name', 'usual_name', 'siret', 'email', 'organizational_unit'].join(' ');

export const authorizationParams = {
  redirect_uri: envVars.PC_REDIRECT_URI,
  scope: scopes,
  login_hint: '',
  claims: {
    id_token: {
      acr: {
        essential: true,
        values: [
          'eidas2',
          'eidas3',
          'https://proconnect.gouv.fr/assurance/self-asserted-2fa',
          'https://proconnect.gouv.fr/assurance/consistency-checked-2fa',
        ],
      },
    },
  },
};
